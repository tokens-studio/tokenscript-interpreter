import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import {
  isLanguageError,
  type LanguageError,
  ParserError,
  ParserErrorCode,
  ProcessorError,
  ProcessorErrorCode,
} from "@interpreter/errors";
import type { InterpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import {
  BooleanSymbol,
  DictionarySymbol,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  StringSymbol,
  TokenSymbol,
} from "@interpreter/symbols";
import { renameReferences } from "@interpreter/utils/references";
import { isArray, isBoolean, isNull, isNumber, isObject, isString } from "@interpreter/utils/type";
import {
  type ISymbolType,
  SCRIPT_ONLY_STATEMENT_KEYWORDS,
  UNINTERPRETED_KEYWORDS,
} from "@src/types";
import { createDependencyError } from "../errors";
import {
  createTokenSymbol,
  createTokenSymbolFromResolvedFields,
  type ObjectParser,
} from "../object-parsers";
import { DependencyGraph } from "../utils/DependencyGraph";
import { validateTokenPath } from "../utils/name-validation";
import { extractStringFields } from "../utils/structured-tokens";
import { getTokenValue, setTokenValue, type TokenData } from "../utils/tokens";
import type { ValidationIssue } from "../validator";
import { ValidationSeverity } from "../validator";
import { DependencyTracker } from "./DependencyTracker";
import { PrefixManager } from "./PrefixManager";
import { ReadinessTracker } from "./ReadinessTracker";
import { ResolutionNotifier } from "./ResolutionNotifier";
import { TokenInterpreter } from "./TokenInterpreter";
import type {
  CreateTokenParams,
  CreateTokenResult,
  DeleteTokenParams,
  DeleteTokenResult,
  IssuesMap,
  RefPath,
  ResolvedValueMap,
  ResolveIssue,
  ResolveValueParams,
  ResolveValueResult,
  TokenDataMap,
  TokenInputMap,
  TokenResult,
  TokenResultMap,
  UnresolvedTokenMap,
  UpdateTokenParams,
  UpdateTokenResult,
} from "./types";

/**
 * Validate a resolved value against a registered token type spec.
 * Returns an array of ValidationIssue for any failures.
 *
 * Shared between PrefixResolver (full resolution) and TokenResolver.resolveValue
 * (lightweight preview resolution).
 */
function collectTypeValidationIssues(
  config: Config | undefined,
  tokenName: RefPath,
  tokenType: string,
  value: InterpreterResult,
): ValidationIssue[] {
  if (!config?.tokenManager) return [];
  if (!config.tokenManager.getSpecByType(tokenType)) return [];

  if (value === null || typeof value === "string") return [];

  let valueToValidate: ListSymbol | DictionarySymbol | typeof value;

  if (value instanceof TokenSymbol) {
    const innerValue = value.value;
    if (Array.isArray(innerValue)) {
      valueToValidate = new ListSymbol(innerValue, false, config);
    } else if (innerValue instanceof Map) {
      valueToValidate = new DictionarySymbol(innerValue, config);
    } else {
      valueToValidate = value;
    }
  } else if (typeof value === "object" && value !== null && "type" in value) {
    valueToValidate = value;
  } else {
    return [];
  }

  const validationResults = config.tokenManager.validate(tokenType, valueToValidate as ISymbolType);

  const issues: ValidationIssue[] = [];
  for (const result of validationResults) {
    if (!result.valid && result.error) {
      const isNested = result.path && result.path.length > 0;
      issues.push({
        code: result.error,
        severity: ValidationSeverity.WARNING,
        message: isNested
          ? `Validation failed at ${result.path?.join(".")}: ${result.error}`
          : `Token validation failed: ${result.error}`,
        tokenName,
        path: result.path,
        data: isNested
          ? { tokenType: result.tokenType, parentTokenType: tokenType }
          : { tokenType },
      });
    }
  }
  return issues;
}

/**
 * Parse a field path string into an array of path segments.
 * E.g., "[0].blur" -> [0, "blur"]
 * E.g., "offsetX" -> ["offsetX"]
 * E.g., "[0][1].color" -> [0, 1, "color"]
 */
function parseFieldPath(fieldPath: string): (string | number)[] {
  const result: (string | number)[] = [];
  let remaining = fieldPath;

  while (remaining.length > 0) {
    // Check for array index: [n]
    const arrayMatch = remaining.match(/^\[(\d+)\]/);
    if (arrayMatch) {
      result.push(parseInt(arrayMatch[1], 10));
      remaining = remaining.substring(arrayMatch[0].length);
      continue;
    }

    // Check for property access: .name or name (at start)
    const propMatch = remaining.match(/^\.?([^.[\]]+)/);
    if (propMatch) {
      result.push(propMatch[1]);
      remaining = remaining.substring(propMatch[0].length);
      continue;
    }

    // Skip leading dot
    if (remaining.startsWith(".")) {
      remaining = remaining.substring(1);
      continue;
    }

    // Unknown format, break to avoid infinite loop
    break;
  }

  return result;
}

/**
 * Convert a LanguageError to a ValidationIssue for uniform interface.
 * This allows sub-field errors to be in the same format as validation issues.
 */
function errorToValidationIssue(
  error: LanguageError,
  parentToken: RefPath,
  path: (string | number)[],
): ValidationIssue {
  return {
    code: error.code,
    severity: ValidationSeverity.ERROR,
    message: path.length > 0 ? `Error at ${path.join(".")}: ${error.message}` : error.message,
    tokenName: parentToken,
    path,
    line: error.line,
    data: error.data as Record<string, unknown>,
  };
}

export type ProcessorResult = {
  graph: DependencyGraph<RefPath>;
  resolved: TokenResultMap;
  issues?: IssuesMap;
};

export type ProcessorCallbacks = {
  onResolve?: (tokenName: RefPath, value: InterpreterResult) => void;
  onError?: (
    tokenName: RefPath,
    error: Error,
    originalValue: string | unknown,
    metadata?: { isSubField: boolean; parentToken?: string; fieldPath?: string },
  ) => void;
};

export type ProcessorOutput = ProcessorResult & {
  tokens: ResolvedValueMap;
  resolver: TokenResolver;
  issues?: IssuesMap;
};

export type ResolverParams = {
  tokens: TokenInputMap;
  callbacks?: ProcessorCallbacks;
  config?: Config;
  objectParsers?: ObjectParser[];
  initialCache?: ResolvedValueMap;
};

/**
 * Find all tokens affected by a change to the given token.
 *
 * Uses BFS traversal on the reverse dependency graph to identify
 * the changed token plus all tokens that transitively depend on it.
 *
 * @param tokenName - The token that changed
 * @param graph - The dependency graph from ProcessorResult
 * @returns Object containing affected tokens and a subgraph showing their relationships
 *
 * @example
 * const { tokens, subgraph } = getTokenDependencyGraph("color.primary", processorResult.graph);
 * console.log(tokens); // Set(['color.primary', 'button.background', ...])
 * console.log(subgraph.getNodes()); // Map showing dependency relationships
 */
export function getTokenDependencyGraph(
  tokenName: RefPath,
  graph: DependencyGraph<RefPath>,
): {
  tokens: Set<RefPath>;
  subgraph: DependencyGraph<RefPath>;
} {
  // Build reverse dependency graph to find dependents
  const reverseDeps = new Map<RefPath, Set<RefPath>>();
  const graphNodes = graph.getNodes();

  for (const [node, dependencies] of graphNodes) {
    for (const dep of dependencies) {
      if (!reverseDeps.has(dep)) {
        reverseDeps.set(dep, new Set());
      }
      reverseDeps.get(dep)?.add(node);
    }
  }

  // Find all tokens transitively affected by this change using BFS
  const affectedTokens = new Set<RefPath>();
  const queue: RefPath[] = [tokenName];
  const visited = new Set<RefPath>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || visited.has(current)) continue;

    visited.add(current);
    affectedTokens.add(current);

    // Add all tokens that depend on this one
    const dependents = reverseDeps.get(current);
    if (dependents) {
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          queue.push(dependent);
        }
      }
    }
  }

  // Build subgraph containing only affected tokens and their relationships
  const subgraph = new DependencyGraph<RefPath>();
  for (const token of affectedTokens) {
    const dependencies = graphNodes.get(token);
    if (dependencies) {
      // Only include dependencies that are also in the affected set
      const affectedDeps = new Set<RefPath>();
      for (const dep of dependencies) {
        if (affectedTokens.has(dep)) {
          affectedDeps.add(dep);
        }
      }
      subgraph.addNode(token, affectedDeps);
    } else {
      subgraph.addNode(token, []);
    }
  }

  return {
    tokens: affectedTokens,
    subgraph,
  };
}

class PrefixResolver {
  private readonly tokens: TokenInputMap;
  private readonly callbacks?: ProcessorCallbacks;
  private readonly config?: Config;
  private readonly objectParsers?: ObjectParser[];
  private readonly graph = new DependencyGraph<RefPath>();
  private readonly resolved: TokenResultMap = new Map();
  private readonly unresolved: UnresolvedTokenMap = new Map();
  private readonly referenceCache: ResolvedValueMap = new Map();
  private readonly pendingResolution: Set<RefPath> = new Set();
  private readonly readyQueue: Set<RefPath> = new Set();

  // Core components
  private readonly dependencyTracker: DependencyTracker;
  private readonly prefixManager: PrefixManager;
  private readonly tokenInterpreter: TokenInterpreter;

  // Phase 3: Optimization components
  private readonly notifier: ResolutionNotifier;
  private readonly readinessTracker: ReadinessTracker;

  // Structured tokens tracking
  private readonly subFieldPaths: Set<RefPath> = new Set();
  private readonly structuredTokens: TokenDataMap = new Map();

  // Issues collection (errors and lint issues)
  private readonly issues: IssuesMap = new Map();

  // Phase state
  private earlyResolved: RefPath[] = [];

  // Track missing dependencies that were referenced but don't exist
  private missingDependencies: Set<RefPath> = new Set();

  constructor(private readonly params: ResolverParams) {
    const { tokens, callbacks, config, objectParsers } = params;

    this.tokens = tokens;
    this.callbacks = callbacks;
    this.config = config;
    this.objectParsers = objectParsers;

    // Initialize components
    this.dependencyTracker = new DependencyTracker();
    this.prefixManager = new PrefixManager(config);
    this.tokenInterpreter = new TokenInterpreter(this.referenceCache, config);

    // Initialize Phase 3 optimization components
    this.readinessTracker = new ReadinessTracker();
    this.notifier = new ResolutionNotifier(
      this.dependencyTracker,
      this.prefixManager,
      this.readinessTracker,
      this.pendingResolution,
      this.readyQueue,
      (tokenName) => this.resolveSingleToken(tokenName),
      (prefix, cache) => this.buildPrefixDictionary(prefix, cache),
    );
  }

  private addIssue(tokenName: RefPath, issue: ResolveIssue): void {
    const existing = this.issues.get(tokenName) || [];
    this.issues.set(tokenName, [...existing, issue]);
  }

  /**
   * Add an issue for a sub-field, converting the error to a ValidationIssue.
   * This ensures all issues have a uniform interface (same as validation issues).
   */
  private addSubFieldIssue(parentToken: string, fieldPath: string, error: LanguageError): void {
    const path = parseFieldPath(fieldPath);
    const issue = errorToValidationIssue(error, parentToken, path);
    // Store under parent token name for uniform access
    this.addIssue(parentToken, issue);
  }

  private ensureLanguageError(error: Error): LanguageError {
    if (isLanguageError(error)) {
      return error;
    }
    // Wrap unknown errors as ProcessorError
    return new ProcessorError(ProcessorErrorCode.UNKNOWN_PARSING_ERROR, {
      data: { error: error.message },
    });
  }

  private resolveError(refPath: RefPath, error: LanguageError, value: string): LanguageError {
    // When a token references a missing dependency (e.g., `bar = "{foo}"` where `foo` doesn't exist),
    // we should only report the error on `bar`, not create a phantom entry for `foo` in the output.
    const isActualToken = this.tokens.has(refPath) || this.subFieldPaths.has(refPath);

    if (isActualToken) {
      this.resolved.set(refPath, error);
      this.callbacks?.onError?.(refPath, error, value);

      // For sub-fields, add issue under parent token with path for uniform interface
      if (this.subFieldPaths.has(refPath)) {
        const { parentToken, fieldPath } = this.extractSubFieldMetadata(refPath);
        if (parentToken) {
          this.addSubFieldIssue(parentToken, fieldPath, error);
        } else {
          this.addIssue(refPath, error);
        }
      } else {
        this.addIssue(refPath, error);
      }

      this.earlyResolved.push(refPath);
      this.graph.addNode(refPath, []);
    }

    return error;
  }

  private lintTokenResult(tokenName: RefPath, value: InterpreterResult): void {
    // Skip linting sub-fields (internal tokens for structured token resolution)
    if (this.subFieldPaths.has(tokenName)) return;

    const tokenData = this.tokens.get(tokenName);
    const tokenType =
      tokenData && typeof tokenData === "object" && "$type" in tokenData
        ? tokenData.$type
        : undefined;

    // Run token type validation
    this.validateTokenType(tokenName, tokenType, value);
  }

  private validateTokenType(
    tokenName: RefPath,
    tokenType: string | undefined,
    value: InterpreterResult,
  ): void {
    if (!tokenType) return;
    for (const issue of collectTypeValidationIssues(this.config, tokenName, tokenType, value)) {
      this.addIssue(tokenName, issue);
    }
  }

  /**
   * Normalize a resolved value using the token type's normalization script.
   * Returns the normalized value, or the original if no script or $type.
   */
  private normalizeTokenValue(tokenName: RefPath, value: InterpreterResult): InterpreterResult {
    if (!(value && typeof value === 'object' && 'type' in value)) return value;
    const tokenData = this.tokens.get(tokenName);
    const tokenType =
      tokenData && typeof tokenData === 'object' && '$type' in tokenData
        ? (tokenData as any).$type as string
        : undefined;
    if (!tokenType) return value;
    if (!this.config?.tokenManager) return value;
    return this.config.tokenManager.normalize(tokenType, value as ISymbolType);
  }

  private earlyResolvePrimitiveToken(tokenName: RefPath, value: InterpreterResult): void {
    const normalized = this.normalizeTokenValue(tokenName, value);
    this.resolved.set(tokenName, normalized);
    this.referenceCache.set(tokenName, normalized);
    this.callbacks?.onResolve?.(tokenName, normalized);
    this.lintTokenResult(tokenName, normalized);
    this.graph.addNode(tokenName, []);
    this.earlyResolved.push(tokenName);
  }

  private tryParseExpression(refPath: RefPath, value: string): ParseExpressionResult | Error {
    // Try inline mode first (greedy strings, expression-only).
    // This allows natural values like URLs (http://foo.bar) and dotted paths
    // to be parsed as single strings.
    try {
      return parseExpression(value, { mode: "inline" });
    } catch (error) {
      // Only fall back to script mode when inline mode hit a statement keyword
      // (variable, if, while, etc.). All other errors are genuine failures.
      const isStatementSyntax =
        error instanceof ParserError &&
        (error.code === ParserErrorCode.UNALLOWED_INLINE_SYNTAX ||
          (error.code === ParserErrorCode.UNEXPECTED_TOKEN &&
            SCRIPT_ONLY_STATEMENT_KEYWORDS.has(error.data?.token as string)));
      if (isStatementSyntax) {
        // Expression contains statements, retry in script mode.
      } else if (isLanguageError(error)) {
        return this.resolveError(refPath, error, value);
      } else {
        return this.resolveError(
          refPath,
          new ProcessorError(ProcessorErrorCode.UNKNOWN_PARSING_ERROR, {
            data: { error: error instanceof Error ? error.message : String(error) },
          }),
          value,
        );
      }
    }

    try {
      return parseExpression(value);
    } catch (error) {
      if (isLanguageError(error)) {
        return this.resolveError(refPath, error, value);
      }
      return this.resolveError(
        refPath,
        new ProcessorError(ProcessorErrorCode.UNKNOWN_PARSING_ERROR, {
          data: { error: error instanceof Error ? error.message : String(error) },
        }),
        value,
      );
    }
  }

  private processParsedToken(tokenName: RefPath, ast: ASTNode, dependencies: Set<RefPath>): void {
    this.tokenInterpreter.setTokenAST(tokenName, ast);

    if (dependencies.size > 0) {
      this.unresolved.set(tokenName, { ast, dependencies });
    }

    this.graph.addNode(tokenName, dependencies);

    for (const dep of dependencies) {
      if (this.prefixManager.hasPrefix(dep) && !this.tokens.has(dep)) {
        continue;
      }

      if (this.resolved.has(dep)) continue;

      this.dependencyTracker.addTokenDependency(tokenName, dep);

      if (this.tokens.has(dep)) continue;

      const parentToken = this.prefixManager.findParentToken(dep, this.tokens);
      if (parentToken) {
        this.prefixManager.addVirtualChild(parentToken, dep);
        continue;
      }

      // Track missing dependencies that aren't actual tokens
      // The error will be reported on the token that references it
      if (!this.referenceCache.has(dep) && !this.resolved.has(dep) && !this.tokens.has(dep)) {
        this.missingDependencies.add(dep);
      }
    }
  }

  public resolve(): ProcessorResult {
    this.parseAndBuildGraph();
    this.mapPrefixDependencies();
    this.releaseEarlyResolved();
    this.resolveDependencyFreeTokens();
    this.finalizeResolution();
    return {
      graph: this.graph,
      resolved: this.resolved,
      issues: this.issues.size > 0 ? this.issues : undefined,
    };
  }

  // Expose internal state for incremental updates
  public getGraph(): DependencyGraph<RefPath> {
    return this.graph;
  }

  public getReferenceCache(): Map<string, InterpreterResult> {
    return this.referenceCache;
  }

  public getTokenInterpreter(): TokenInterpreter {
    return this.tokenInterpreter;
  }

  public getSubFieldPaths(): Set<RefPath> {
    return this.subFieldPaths;
  }

  public clone(overrides: Partial<ResolverParams>): PrefixResolver {
    const { tokens, callbacks } = {
      ...this.params,
      ...overrides,
    };

    const resolver = new PrefixResolver({
      tokens,
      callbacks,
      config: this.config,
      objectParsers: this.objectParsers,
    });

    if (overrides.initialCache && overrides.tokens) {
      for (const [tokenName, value] of overrides.initialCache) {
        if (!overrides.tokens.has(tokenName)) {
          resolver.referenceCache.set(tokenName, value);
        }
      }
    }

    return resolver;
  }

  /**
   * Phase 1: Parse and build graph (ResolutionPhase.PARSE_AND_BUILD_GRAPH)
   * - Parse all token values into ASTs
   * - Build dependency graph
   * - Identify and mark early-resolved tokens
   * - Detect missing token dependencies
   * - Handle primitive and structured tokens
   */
  private parseAndBuildGraph(): void {
    this.earlyResolved = [];

    for (const [tokenName, tokenData] of this.tokens.entries()) {
      // Validate token name: each dot-separated segment must not contain
      // spaces, braces, or brackets.
      if (!validateTokenPath(tokenName)) {
        this.addIssue(tokenName, {
          code: "INVALID_TOKEN_NAME",
          severity: ValidationSeverity.ERROR,
          message: `token "${tokenName}" contains invalid characters in name (spaces, braces, or brackets are not allowed)`,
          tokenName,
          data: { path: tokenName },
        });
      }

      const tokenValue = getTokenValue(tokenData);

      // Handle uninterpreted keywords
      if (isString(tokenValue) && UNINTERPRETED_KEYWORDS.includes(tokenValue)) {
        const symbol = new StringSymbol(tokenValue, this.config);
        this.earlyResolvePrimitiveToken(tokenName, symbol);
        continue;
      }

      if (isNumber(tokenValue)) {
        this.earlyResolvePrimitiveToken(tokenName, new NumberSymbol(tokenValue, this.config));
        continue;
      }

      if (isBoolean(tokenValue)) {
        this.earlyResolvePrimitiveToken(tokenName, new BooleanSymbol(tokenValue, this.config));
        continue;
      }

      if (isNull(tokenValue)) {
        this.earlyResolvePrimitiveToken(tokenName, new NullSymbol(this.config));
        continue;
      }

      if (isObject(tokenValue) || isArray(tokenValue)) {
        this.handleStructuredToken(tokenName, setTokenValue(tokenData));
        continue;
      }

      // Handle string values (may contain references)
      const tokenValueStr = String(tokenValue);
      const parseResult = this.tryParseExpression(tokenName, tokenValueStr);
      if (parseResult instanceof Error) {
        continue;
      }

      const { ast, parser } = parseResult;
      if (!ast) {
        this.earlyResolvePrimitiveToken(tokenName, "");
        continue;
      }

      this.prefixManager.addTokenToPrefix(tokenName);
      this.processParsedToken(tokenName, ast, parser.requiredReferences);
    }
  }

  private handleStructuredToken(tokenName: RefPath, tokenData: TokenData): void {
    const tokenValue = tokenData.$value;

    // Store for later assembly
    this.structuredTokens.set(tokenName, tokenData);

    // Extract string fields that may contain references
    const stringFields = extractStringFields(
      tokenValue,
      tokenName,
      this.objectParsers || undefined,
    );

    if (stringFields.size === 0) {
      // No string fields to resolve, token is ready
      // Create TokenSymbol and store it in both resolved and reference cache
      const tokenType = tokenData.$type || "unknown";
      const tokenSymbol = createTokenSymbol(
        tokenValue,
        tokenType,
        this.config,
        this.objectParsers,
        tokenData.$metadata,
      );
      const normalizedSymbol = this.normalizeTokenValue(tokenName, tokenSymbol);
      this.resolved.set(tokenName, normalizedSymbol);
      this.referenceCache.set(tokenName, normalizedSymbol);

      this.callbacks?.onResolve?.(tokenName, normalizedSymbol);
      this.lintTokenResult(tokenName, normalizedSymbol);
      this.graph.addNode(tokenName, []);
      this.earlyResolved.push(tokenName);
      return;
    }

    // Add string fields as virtual tokens
    for (const [fieldPath, fieldValue] of stringFields) {
      this.subFieldPaths.add(fieldPath);

      const parseResult = this.tryParseExpression(fieldPath, fieldValue);
      if (parseResult instanceof Error) {
        continue;
      }

      const { ast, parser } = parseResult;
      if (!ast) {
        this.earlyResolvePrimitiveToken(fieldPath, "");
        continue;
      }

      this.processParsedToken(fieldPath, ast, parser.requiredReferences);
    }

    // Parent token depends on all its sub-fields
    const subFieldDeps = Array.from(stringFields.keys());
    this.graph.addNode(tokenName, subFieldDeps);
    for (const dep of subFieldDeps) {
      this.dependencyTracker.addTokenDependency(tokenName, dep);
    }
    this.unresolved.set(tokenName, {
      ast: null as any,
      dependencies: new Set(subFieldDeps),
    });
  }

  /**
   * Phase 2: Map prefix dependencies (ResolutionPhase.MAP_PREFIX_DEPENDENCIES)
   * - Identify which tokens depend on prefixes
   * - Activate prefix resolution tracking
   * - Mark prefix dependencies for later resolution
   */
  private mapPrefixDependencies(): void {
    for (const [tokenName, unresolved] of this.unresolved.entries()) {
      for (const dep of unresolved.dependencies) {
        if (this.prefixManager.hasPrefix(dep) && !this.tokens.has(dep)) {
          this.prefixManager.activatePrefix(dep);
          this.dependencyTracker.addPrefixDependency(tokenName, dep);
        }
      }
    }
  }

  /**
   * Phase 3: Release early resolved (ResolutionPhase.RELEASE_EARLY_RESOLVED)
   * - Notify dependents of early-resolved tokens
   * - Release prefix dependencies waiting for these tokens
   * - Trigger cascade resolution of dependent tokens
   */
  private releaseEarlyResolved(): void {
    for (const tokenName of this.earlyResolved) {
      this.notifyResolution(tokenName);
    }
  }

  /**
   * Phase 4: Resolve dependency-free tokens (ResolutionPhase.RESOLVE_DEPENDENCY_FREE)
   * - Seed ready queue with initially dependency-free tokens
   * - Process queue in event-driven manner (cascade resolution)
   * - Queue is populated by ResolutionNotifier when dependencies are released
   */
  private resolveDependencyFreeTokens(): void {
    // Seed ready queue with initially dependency-free tokens (including sub-fields)
    const allTokens = new Set([...this.tokens.keys(), ...this.subFieldPaths]);

    for (const tokenName of allTokens) {
      if (this.resolved.has(tokenName)) continue;

      if (this.readinessTracker.isReady(tokenName, this.dependencyTracker)) {
        this.readyQueue.add(tokenName);
      }
    }

    // Process ready queue (event-driven cascade resolution)
    while (this.readyQueue.size > 0) {
      const tokenName = this.readyQueue.values().next().value as RefPath;
      this.readyQueue.delete(tokenName);
      this.resolveSingleToken(tokenName);
    }
  }

  /**
   * Extract parent token and field path from a sub-field token name.
   * Example: "shadow.card.offsetY" -> { parentToken: "shadow.card", fieldPath: "offsetY" }
   * Example: "shadow[0].blur" -> { parentToken: "shadow", fieldPath: "[0].blur" }
   */
  private extractSubFieldMetadata(subFieldPath: RefPath): {
    parentToken: string;
    fieldPath: string;
  } {
    // Find the parent token by checking which structured token this sub-field belongs to
    for (const [parentToken] of this.structuredTokens) {
      // Check for both dot notation (shadow.offsetX) and bracket notation (shadow[0].blur)
      if (
        subFieldPath.startsWith(`${parentToken}.`) ||
        subFieldPath.startsWith(`${parentToken}[`)
      ) {
        const fieldPath = subFieldPath.substring(parentToken.length);
        // Remove leading dot if present (for dot notation like "shadow.offsetX" -> "offsetX")
        const normalizedFieldPath = fieldPath.startsWith(".") ? fieldPath.substring(1) : fieldPath;
        return { parentToken, fieldPath: normalizedFieldPath };
      }
    }

    // Fallback: split on last dot
    const lastDotIndex = subFieldPath.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      return {
        parentToken: subFieldPath.substring(0, lastDotIndex),
        fieldPath: subFieldPath.substring(lastDotIndex + 1),
      };
    }

    // No parent found
    return { parentToken: "", fieldPath: subFieldPath };
  }

  private resolveSingleToken(tokenName: RefPath): void {
    if (this.resolved.has(tokenName)) return;

    // Prevent re-entrant resolution during cascade
    this.pendingResolution.add(tokenName);

    // Check if this is a structured token
    if (this.structuredTokens.has(tokenName)) {
      this.resolveStructuredToken(tokenName);
      this.pendingResolution.delete(tokenName);
      return;
    }

    // Check if this is a sub-field (virtual token)
    if (this.subFieldPaths.has(tokenName)) {
      // Sub-fields are resolved via TokenInterpreter
      const ast = this.tokenInterpreter.getTokenAST(tokenName);
      if (ast) {
        const unresolved = this.unresolved.get(tokenName);
        const dependencyError = unresolved
          ? this.tokenInterpreter.buildDependencyError(
              tokenName,
              unresolved.dependencies,
              this.resolved,
            )
          : undefined;

        if (dependencyError) {
          this.resolved.set(tokenName, dependencyError);
          // Call onError for sub-field with metadata
          const { parentToken, fieldPath } = this.extractSubFieldMetadata(tokenName);
          this.callbacks?.onError?.(tokenName, dependencyError, "", {
            isSubField: true,
            parentToken,
            fieldPath,
          });
          // Add issue under parent token with path for uniform interface
          if (parentToken) {
            this.addSubFieldIssue(parentToken, fieldPath, dependencyError);
          } else {
            this.addIssue(tokenName, dependencyError);
          }
        } else {
          const tokenValue = this.tokenInterpreter.interpretTokenWithAST(tokenName, ast);
          this.resolved.set(tokenName, tokenValue);

          if (tokenValue instanceof Error) {
            // Call onError for sub-field with metadata
            const { parentToken, fieldPath } = this.extractSubFieldMetadata(tokenName);
            this.callbacks?.onError?.(tokenName, tokenValue, "", {
              isSubField: true,
              parentToken,
              fieldPath,
            });
            // Add issue under parent token with path for uniform interface
            const langError = this.ensureLanguageError(tokenValue);
            if (parentToken) {
              this.addSubFieldIssue(parentToken, fieldPath, langError);
            } else {
              this.addIssue(tokenName, langError);
            }
          } else {
            // Don't call onResolve for sub-fields
            this.tokenInterpreter.updateReferenceCache(tokenName, tokenValue);
          }
        }
      }

      this.unresolved.delete(tokenName);
      this.notifyResolution(tokenName);
      this.pendingResolution.delete(tokenName);
      return;
    }

    // For regular tokens
    const originalValue = this.tokens.get(tokenName);
    if (originalValue === undefined) return;

    // For string/primitive tokens
    const tokenValueStr: string = String(getTokenValue(originalValue));

    const unresolved = this.unresolved.get(tokenName);
    const dependencyError = unresolved
      ? this.tokenInterpreter.buildDependencyError(
          tokenName,
          unresolved.dependencies,
          this.resolved,
        )
      : undefined;

    let tokenValue: TokenResult;

    if (dependencyError) {
      tokenValue = dependencyError;
      this.resolved.set(tokenName, dependencyError);
      this.callbacks?.onError?.(tokenName, dependencyError, tokenValueStr);
      this.addIssue(tokenName, dependencyError);
    } else {
      tokenValue = this.tokenInterpreter.interpretToken(tokenName, tokenValueStr);

      if (tokenValue instanceof Error) {
        this.resolved.set(tokenName, tokenValue);
        this.callbacks?.onError?.(tokenName, tokenValue, tokenValueStr);
        this.addIssue(tokenName, this.ensureLanguageError(tokenValue));
      } else {
        const normalizedValue = this.normalizeTokenValue(tokenName, tokenValue);
        tokenValue = normalizedValue as TokenResult;
        this.resolved.set(tokenName, normalizedValue);
        this.callbacks?.onResolve?.(tokenName, normalizedValue);
        this.lintTokenResult(tokenName, normalizedValue);
        this.tokenInterpreter.updateReferenceCache(tokenName, normalizedValue);
      }
    }

    const flattened = this.tokenInterpreter.flattenDictionaryToCache(tokenName, tokenValue);
    this.resolveVirtualChildren(tokenName, flattened);
    this.notifyResolution(tokenName, flattened);
    this.unresolved.delete(tokenName);
    this.pendingResolution.delete(tokenName);
  }

  /**
   * Resolve a structured token by assembling resolved sub-fields
   */
  private resolveStructuredToken(tokenName: RefPath): void {
    const tokenData = this.structuredTokens.get(tokenName);
    if (!tokenData) return;

    const originalValue = tokenData.$value;

    // Extract string fields
    const stringFields = extractStringFields(
      originalValue,
      tokenName,
      this.objectParsers || undefined,
    );

    // Check for dependency errors in sub-fields
    const resolvedFields = new Map<string, InterpreterResult>();
    let hasError = false;

    for (const [fieldPath] of stringFields) {
      const fieldValue = this.resolved.get(fieldPath);
      if (fieldValue === undefined) {
        // Sub-field not resolved yet (shouldn't happen if dependencies are correct)
        const error = new ProcessorError(ProcessorErrorCode.SUB_FIELD_NOT_RESOLVED, {
          data: { fieldPath },
        });
        this.resolved.set(tokenName, error);
        this.callbacks?.onError?.(tokenName, error, originalValue);
        this.addIssue(tokenName, error);
        hasError = true;
        break;
      }
      if (fieldValue instanceof Error) {
        // Sub-field has error, propagate to parent
        this.resolved.set(tokenName, fieldValue);
        this.callbacks?.onError?.(tokenName, fieldValue, originalValue);
        this.addIssue(tokenName, this.ensureLanguageError(fieldValue));
        hasError = true;
        break;
      }
      resolvedFields.set(fieldPath, fieldValue);
    }

    if (!hasError) {
      // Create TokenSymbol directly from resolved fields and original value
      const tokenType = tokenData.$type || "unknown";
      const tokenSymbol = createTokenSymbolFromResolvedFields(
        tokenName,
        resolvedFields,
        originalValue,
        tokenType,
        this.config,
        this.objectParsers,
        tokenData.$metadata,
      );
      const normalizedSymbol = this.normalizeTokenValue(tokenName, tokenSymbol);
      this.resolved.set(tokenName, normalizedSymbol);
      this.referenceCache.set(tokenName, normalizedSymbol);

      this.callbacks?.onResolve?.(tokenName, normalizedSymbol);
      this.lintTokenResult(tokenName, normalizedSymbol);
    }

    this.unresolved.delete(tokenName);
    this.notifyResolution(tokenName);
  }

  private resolveVirtualChildren(parent: RefPath, flattened: RefPath[]): void {
    const children = this.prefixManager.getAndRemoveVirtualChildren(parent);
    if (children.size === 0) return;

    const satisfied = flattened.length > 0 ? new Set(flattened) : null;
    const parentValue = this.resolved.get(parent);

    for (const child of children) {
      if (satisfied?.has(child) || this.referenceCache.has(child) || this.resolved.has(child)) {
        continue;
      }

      const error =
        parentValue instanceof Error
          ? createDependencyError(child, parent, parentValue)
          : new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
              data: { tokenName: child },
            });

      this.resolved.set(child, error);
      this.callbacks?.onError?.(child, error, "");
    }
  }

  private notifyResolution(name: RefPath, flattened?: RefPath[]): void {
    this.notifier.releaseDependencies(name, flattened, this.referenceCache);
  }

  /**
   * Helper for ResolutionNotifier to build prefix dictionaries
   */
  private buildPrefixDictionary(prefix: string, cache: Map<string, InterpreterResult>): void {
    const dictionary = this.prefixManager.buildPrefixDictionary(prefix, cache);
    if (dictionary) {
      cache.set(prefix, dictionary);
    }
  }

  /**
   * Phase 5: Finalize resolution (ResolutionPhase.FINALIZE)
   * - Handle any true stragglers not caught by event-driven phase
   * - Generate errors for unresolved tokens with dependency issues
   * - Check for circular dependencies
   */
  private finalizeResolution(): void {
    const unresolvedTokens: RefPath[] = [];

    // Handle unresolved tokens (both regular tokens and sub-fields)
    const allTokens = new Set([...this.tokens.keys(), ...this.subFieldPaths]);

    for (const tokenName of allTokens) {
      if (this.resolved.has(tokenName)) continue;

      const isSubField = this.subFieldPaths.has(tokenName);

      let tokenValueStr = "";
      if (!isSubField) {
        const originalValue = this.tokens.get(tokenName);
        if (originalValue === undefined) continue;
        tokenValueStr = String(getTokenValue(originalValue));
      }

      // Check for dependency errors
      const unresolved = this.unresolved.get(tokenName);
      if (unresolved) {
        const dependencyError = this.tokenInterpreter.buildDependencyError(
          tokenName,
          unresolved.dependencies,
          this.resolved,
          this.missingDependencies,
        );
        if (dependencyError) {
          this.resolved.set(tokenName, dependencyError);

          if (isSubField) {
            // Call onError for sub-field with metadata
            const { parentToken, fieldPath } = this.extractSubFieldMetadata(tokenName);
            this.callbacks?.onError?.(tokenName, dependencyError, tokenValueStr, {
              isSubField: true,
              parentToken,
              fieldPath,
            });
            // Add issue under parent token with path for uniform interface
            if (parentToken) {
              this.addSubFieldIssue(parentToken, fieldPath, dependencyError);
            } else {
              this.addIssue(tokenName, dependencyError);
            }
          } else {
            this.callbacks?.onError?.(tokenName, dependencyError, tokenValueStr);
            this.addIssue(tokenName, dependencyError);
          }

          this.resolveVirtualChildren(tokenName, []);
          this.notifyResolution(tokenName);
          this.unresolved.delete(tokenName);
          continue;
        }
      }

      unresolvedTokens.push(tokenName);
    }

    // Process any tokens that became ready during dependency error resolution
    while (this.readyQueue.size > 0) {
      const tokenName = this.readyQueue.values().next().value as RefPath;
      this.readyQueue.delete(tokenName);
      this.resolveSingleToken(tokenName);
    }

    // Filter out tokens that were resolved during the ready queue processing
    const stillUnresolved = unresolvedTokens.filter((tokenName) => !this.resolved.has(tokenName));

    // Handle remaining unresolved tokens
    if (stillUnresolved.length > 0) {
      // Build a set of tokens that depend on missing dependencies
      const tokensWithMissingDeps = new Set<string>();

      // Check each unresolved token to see if it depends on missing tokens
      for (const tokenName of stillUnresolved) {
        const unresolvedData = this.unresolved.get(tokenName);
        if (unresolvedData) {
          // Check if any of its dependencies are missing
          for (const dep of unresolvedData.dependencies) {
            if (this.missingDependencies.has(dep)) {
              tokensWithMissingDeps.add(tokenName);
              break;
            }
          }
        }
      }

      for (const tokenName of stillUnresolved) {
        const isSubField = this.subFieldPaths.has(tokenName);

        let tokenValueStr = "";
        if (!isSubField) {
          const originalValue = this.tokens.get(tokenName);
          if (originalValue === undefined) continue;
          tokenValueStr = String(getTokenValue(originalValue));
        }

        // If token depends on missing dependencies, it's not a circular dependency
        // Otherwise, if it's still unresolved, it must be part of a cycle
        const dependsOnMissing = tokensWithMissingDeps.has(tokenName);
        const error = dependsOnMissing
          ? new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
              data: { tokenName },
            })
          : new ProcessorError(ProcessorErrorCode.CIRCULAR_DEPENDENCY, {
              data: { tokens: tokenName },
            });

        this.resolved.set(tokenName, error);

        if (isSubField) {
          const { parentToken, fieldPath } = this.extractSubFieldMetadata(tokenName);
          this.callbacks?.onError?.(tokenName, error, tokenValueStr, {
            isSubField: true,
            parentToken,
            fieldPath,
          });
          // Add issue under parent token with path for uniform interface
          if (parentToken) {
            this.addSubFieldIssue(parentToken, fieldPath, error);
          } else {
            this.addIssue(tokenName, error);
          }
        } else {
          this.callbacks?.onError?.(tokenName, error, tokenValueStr);
          this.addIssue(tokenName, error);
        }

        this.resolveVirtualChildren(tokenName, []);
        this.notifyResolution(tokenName);
        this.unresolved.delete(tokenName);
      }
    }
  }
}

/**
 * TokenResolver - Resolves tokens with dependencies using prefix-aware resolution
 *
 * @example
 * const processor = new TokenResolver();
 * const tokens = new Map([
 *   ["a", { $value: "10" }],
 *   ["b", { $value: "{a} * 2" }],
 * ]);
 * const result = processor.build(tokens);
 */
export class TokenResolver {
  private prefixResolver?: PrefixResolver;
  private tokens?: TokenDataMap;
  private config?: Config;
  private objectParsers?: ObjectParser[];

  public processTokens(
    tokens: TokenInputMap,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    objectParsers?: ObjectParser[],
  ): ProcessorResult {
    const resolver = new PrefixResolver({
      tokens,
      callbacks,
      config,
      objectParsers,
    });
    return resolver.resolve();
  }

  /**
   * Find all tokens affected by a change to the given token.
   *
   * Uses BFS traversal on the reverse dependency graph to identify
   * the changed token plus all tokens that transitively depend on it.
   *
   * @param tokenName - The token that changed
   * @returns Object containing affected tokens and a subgraph showing their relationships
   *
   * @example
   * const { resolver } = new TokenResolver().build(tokens);
   * const { tokens, subgraph } = resolver.getTokenDependencyGraph("color.primary");
   * console.log(tokens); // Set(['color.primary', 'button.background', ...])
   */
  public getTokenDependencyGraph(tokenName: RefPath): {
    tokens: Set<RefPath>;
    subgraph: DependencyGraph<RefPath>;
  } {
    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }

    const graph = this.prefixResolver.getGraph();

    // Build reverse dependency graph to find dependents
    const reverseDeps = new Map<RefPath, Set<RefPath>>();
    const graphNodes = graph.getNodes();

    for (const [node, dependencies] of graphNodes) {
      for (const dep of dependencies) {
        if (!reverseDeps.has(dep)) {
          reverseDeps.set(dep, new Set());
        }
        reverseDeps.get(dep)?.add(node);
      }
    }

    // Find all tokens transitively affected by this change using BFS
    const affectedTokens = new Set<RefPath>();
    const queue: RefPath[] = [tokenName];
    const visited = new Set<RefPath>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || visited.has(current)) continue;

      visited.add(current);
      affectedTokens.add(current);

      // Add all tokens that depend on this one
      const dependents = reverseDeps.get(current);
      if (dependents) {
        for (const dependent of dependents) {
          if (!visited.has(dependent)) {
            queue.push(dependent);
          }
        }
      }
    }

    // Build subgraph containing only affected tokens and their relationships
    const subgraph = new DependencyGraph<RefPath>();
    for (const token of affectedTokens) {
      const dependencies = graphNodes.get(token);
      if (dependencies) {
        // Only include dependencies that are also in the affected set
        const affectedDeps = new Set<RefPath>();
        for (const dep of dependencies) {
          if (affectedTokens.has(dep)) {
            affectedDeps.add(dep);
          }
        }
        subgraph.addNode(token, affectedDeps);
      } else {
        subgraph.addNode(token, []);
      }
    }

    return {
      tokens: affectedTokens,
      subgraph,
    };
  }

  public build(
    tokens: TokenDataMap,
    config?: Config,
    objectParsers?: ObjectParser[],
  ): ProcessorOutput {
    const output: ResolvedValueMap = new Map();

    const callbacks: ProcessorCallbacks = {
      onResolve: (tokenName, value) => {
        output.set(tokenName, value);
      },
      onError: (tokenName, _error, originalValue) => {
        // Store the original value in output for tokens with errors
        // Cast to any since originalValue can be an object for structured tokens
        output.set(tokenName, originalValue as any);
        // Errors are tracked in the issues map
      },
    };

    // Create and store the resolver for future updates
    this.prefixResolver = new PrefixResolver({
      tokens,
      callbacks,
      config,
      objectParsers,
    });
    this.tokens = tokens;
    this.config = config;
    this.objectParsers = objectParsers;

    const result = this.prefixResolver.resolve();

    // Filter out sub-field paths from output and issues
    const subFieldPaths = this.prefixResolver.getSubFieldPaths();
    if (subFieldPaths.size > 0) {
      for (const subFieldPath of subFieldPaths) {
        output.delete(subFieldPath);
        result.issues?.delete(subFieldPath);
      }
    }

    return {
      ...result,
      tokens: output,
      resolver: this,
      issues: result.issues,
    };
  }

  private ensureInitialized(): void {
    if (!this.prefixResolver || !this.tokens) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }
  }

  private normalizeTokenPath(tokenPath: string | null | undefined): string {
    return tokenPath?.trim() || "";
  }

  private createOutputCallbacks(): {
    output: ResolvedValueMap;
    callbacks: ProcessorCallbacks;
  } {
    const output: ResolvedValueMap = new Map();
    const callbacks: ProcessorCallbacks = {
      onResolve: (name, value) => {
        output.set(name, value);
      },
      onError: (_name, _error) => {
        // Errors are already tracked in the PrefixResolver's issues map
      },
    };
    return { output, callbacks };
  }

  private rebuildResolver(
    updatedTokens: TokenDataMap,
    callbacks: ProcessorCallbacks,
    changedTokenPath?: string,
  ): ProcessorResult {
    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }

    // Use the dependency graph to find tokens affected by the change.
    // Only unaffected tokens get their cached values seeded — affected tokens
    // (and deleted tokens) must be re-resolved from scratch.
    let dirtyTokens: Set<string> | null = null;
    if (changedTokenPath) {
      const graph = this.prefixResolver.getGraph();
      const { tokens: affected } = getTokenDependencyGraph(changedTokenPath, graph);
      dirtyTokens = affected;
    }

    const newResolver = this.prefixResolver.clone({
      tokens: updatedTokens,
      callbacks,
    });

    const oldCache = this.prefixResolver.getReferenceCache();
    const newCache = newResolver.getReferenceCache();
    for (const [tokenName, value] of oldCache) {
      if (!updatedTokens.has(tokenName)) continue; // deleted token
      if (dirtyTokens?.has(tokenName)) continue; // affected by change
      newCache.set(tokenName, value);
    }

    const result = newResolver.resolve();
    this.prefixResolver = newResolver;
    return result;
  }

  public updateToken(params: UpdateTokenParams): UpdateTokenResult {
    this.ensureInitialized();

    const { tokenPath, tokenData, tokenPathRenamed, updateReferences = false } = params;
    const prevPath = this.normalizeTokenPath(tokenPath);
    const newPath = tokenPathRenamed?.trim();

    if (!this.tokens || !this.tokens.has(prevPath)) {
      if (tokenData) {
        const createResult = this.createToken({
          tokenPath: prevPath,
          tokenData,
        });
        return {
          ...createResult,
          updated: false,
        };
      }
      throw new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
        data: { tokenName: prevPath },
      });
    }

    const oldTokenData = this.tokens.get(prevPath);
    if (!oldTokenData) {
      throw new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
        data: { tokenName: prevPath },
      });
    }

    const isRename = newPath && newPath !== prevPath;

    // Validate newPath doesn't already exist when renaming
    if (isRename && this.tokens.has(newPath)) {
      throw new ProcessorError(ProcessorErrorCode.TOKEN_ALREADY_EXISTS, {
        data: { tokenName: newPath },
      });
    }

    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }
    const currentGraph = this.prefixResolver.getGraph();
    const { tokens: affectedTokens } = getTokenDependencyGraph(prevPath, currentGraph);
    affectedTokens.delete(prevPath);

    const updatedTokens = new Map(this.tokens);

    // Handle rename with reference updates if requested
    if (isRename && updateReferences && affectedTokens.size > 0) {
      const renameMap = { [prevPath]: newPath };
      const tokenInterpreter = this.prefixResolver.getTokenInterpreter();

      // Update references in all dependent tokens
      for (const dependentToken of affectedTokens) {
        const dependentTokenData = updatedTokens.get(dependentToken);
        if (!dependentTokenData) continue;

        const dependentValue = getTokenValue(dependentTokenData);
        if (!isString(dependentValue)) continue;

        // Get cached AST instead of reparsing
        const ast = tokenInterpreter.getTokenAST(dependentToken);
        if (!ast) continue;

        // Rename references using the utility function
        const updatedValue = renameReferences(dependentValue, ast, renameMap);

        // Only update if there was an actual change
        if (updatedValue !== dependentValue) {
          const updatedTokenData = { ...dependentTokenData, $value: updatedValue };
          updatedTokens.set(dependentToken, updatedTokenData);
        }
      }
    }

    // Update/rename the token itself
    updatedTokens.delete(prevPath);
    const finalPath = isRename ? newPath : prevPath;
    updatedTokens.set(finalPath, tokenData || oldTokenData);
    this.tokens = updatedTokens;

    const { output, callbacks } = this.createOutputCallbacks();
    const resolverResult = this.rebuildResolver(updatedTokens, callbacks, prevPath);

    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }
    const { subgraph } = getTokenDependencyGraph(finalPath, this.prefixResolver.getGraph());

    const resolvedValue = output.get(finalPath);

    return {
      tokens: output,
      resolved: resolvedValue,
      issues: resolverResult.issues,
      dependants: { graph: subgraph },
      updated: true,
    };
  }

  public createToken(params: CreateTokenParams): CreateTokenResult {
    this.ensureInitialized();

    const { tokenPath, tokenData } = params;
    const normalizedTokenPath = this.normalizeTokenPath(tokenPath);

    if (this.tokens?.has(normalizedTokenPath)) {
      throw new ProcessorError(ProcessorErrorCode.TOKEN_ALREADY_EXISTS, {
        data: { tokenName: normalizedTokenPath },
      });
    }

    const updatedTokens = new Map(this.tokens);
    updatedTokens.set(normalizedTokenPath, tokenData);
    this.tokens = updatedTokens;

    const { output, callbacks } = this.createOutputCallbacks();
    const resolverResult = this.rebuildResolver(updatedTokens, callbacks, normalizedTokenPath);

    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }
    const { subgraph } = getTokenDependencyGraph(
      normalizedTokenPath,
      this.prefixResolver.getGraph(),
    );

    const resolvedValue = output.get(normalizedTokenPath);

    return {
      tokens: output,
      resolved: resolvedValue,
      issues: resolverResult.issues,
      dependants: { graph: subgraph },
      created: true,
    };
  }

  public deleteToken(params: DeleteTokenParams): DeleteTokenResult {
    this.ensureInitialized();

    const { tokenPath } = params;
    const normalizedTokenPath = this.normalizeTokenPath(tokenPath);

    if (!this.tokens?.has(normalizedTokenPath)) {
      throw new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
        data: { tokenName: normalizedTokenPath },
      });
    }

    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }
    const currentGraph = this.prefixResolver.getGraph();
    const { subgraph } = getTokenDependencyGraph(normalizedTokenPath, currentGraph);

    // Remove the deleted token from the subgraph (it no longer exists)
    subgraph.removeNode(normalizedTokenPath);

    const updatedTokens = new Map(this.tokens);
    updatedTokens.delete(normalizedTokenPath);
    this.tokens = updatedTokens;

    const { output, callbacks } = this.createOutputCallbacks();
    const resolverResult = this.rebuildResolver(updatedTokens, callbacks, normalizedTokenPath);

    return {
      tokens: output,
      issues: resolverResult.issues,
      dependants: { graph: subgraph },
    };
  }

  /**
   * Resolve a single value expression against the existing warm cache.
   * No cloning, no graph rebuild, no re-parsing of other tokens.
   * Use this for lightweight preview resolution (e.g. live form input).
   *
   * **Important:** This method reads from the resolver's current cache and
   * shares its interpreter instance. It is intended for development-time
   * previews only. Callers that need isolation (e.g. speculative resolution
   * that must not observe or affect other operations) should clone the
   * `TokenResolver` first via `build()` on a copy of the token map.
   *
   * Must not be called concurrently with `updateToken`, `createToken`,
   * or `deleteToken` — those methods rebuild the internal resolver and
   * the shared interpreter state would conflict.
   */
  public resolveValue(params: ResolveValueParams): ResolveValueResult {
    this.ensureInitialized();

    if (!this.prefixResolver) {
      throw new ProcessorError(ProcessorErrorCode.RESOLVER_NOT_INITIALIZED);
    }

    const { value, type, validate } = params;
    const issues: ResolveIssue[] = [];

    if (value === undefined || value === null || value === "") {
      return { resolved: null, issues };
    }

    const valueStr = String(value);

    // Parse the expression — LanguageErrors are thrown on syntax errors
    let ast: ASTNode | null = null;
    try {
      const result = parseExpression(valueStr);
      ast = result.ast;
    } catch (error) {
      if (isLanguageError(error)) {
        issues.push(error);
        return { resolved: null, issues };
      }
      throw error;
    }

    if (!ast) {
      return { resolved: valueStr, issues };
    }

    // Interpret against the warm reference cache — no clone, no rebuild
    const tokenInterpreter = this.prefixResolver.getTokenInterpreter();
    const resolved = tokenInterpreter.interpretTokenWithAST("\0__preview__", ast);

    if (resolved instanceof Error) {
      if (isLanguageError(resolved)) {
        issues.push(resolved);
      }
      return { resolved: null, issues };
    }

    // Normalize using token type script (e.g. bare 300 → 300ms for duration)
    let normalizedResolved = resolved;
    if (type && resolved && typeof resolved === 'object' && 'type' in resolved) {
      normalizedResolved = this.config.tokenManager.normalize(type, resolved as ISymbolType);
    }

    if (validate && type) {
      issues.push(...collectTypeValidationIssues(this.config, "\0__preview__", type, normalizedResolved));
    }

    return { resolved: normalizedResolved, issues };
  }
}
