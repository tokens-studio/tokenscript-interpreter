import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { isLanguageError, ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import type { InterpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import { BooleanSymbol, NullSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { isArray, isBoolean, isNull, isNumber, isObject, isString } from "@interpreter/utils/type";
import { UNINTERPRETED_KEYWORDS } from "@src/types";
import { DependencyError } from "../errors";
import type { LintIssue, LintRunner } from "../linter";
import {
  createTokenSymbol,
  createTokenSymbolFromResolvedFields,
  type ObjectParser,
} from "../object-parsers";
import { DependencyGraph } from "../utils/DependencyGraph";
import { extractStringFields } from "../utils/structured-tokens";
import { getTokenValue, setTokenValue, type TokenData } from "../utils/tokens";
import { DependencyTracker } from "./DependencyTracker";
import { PrefixManager } from "./PrefixManager";
import { ReadinessTracker } from "./ReadinessTracker";
import { ResolutionNotifier } from "./ResolutionNotifier";
import { TokenInterpreter } from "./TokenInterpreter";
import type {
  RefPath,
  ResolvedValueMap,
  TokenDataMap,
  TokenErrorMap,
  TokenInputMap,
  TokenResult,
  TokenResultMap,
  UnresolvedTokenMap,
  UpdateTokenParams,
  UpdateTokenResult,
} from "./types";

export type ProcessorResult = {
  graph: DependencyGraph<RefPath>;
  resolved: TokenResultMap;
  unresolved: UnresolvedTokenMap;
  subFieldPaths?: Set<RefPath>;
  lintIssues?: LintIssue[];
};

export type ProcessorCallbacks = {
  onResolve?: (tokenName: RefPath, value: InterpreterResult) => void;
  onError?: (
    tokenName: RefPath,
    error: Error,
    originalValue: string,
    metadata?: { isSubField: boolean; parentToken?: string; fieldPath?: string },
  ) => void;
};

export type ProcessorOutput = ProcessorResult & {
  tokens: ResolvedValueMap;
  errors: TokenErrorMap;
  resolver: TokenResolver;
};

export type ResolverParams = {
  tokens: TokenInputMap;
  callbacks?: ProcessorCallbacks;
  config?: Config;
  objectParsers?: ObjectParser[];
  linter?: LintRunner;
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
  private readonly linter?: LintRunner;
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

  // Lint issues collection
  private readonly lintIssues: LintIssue[] = [];

  // Phase state
  private earlyResolved: RefPath[] = [];

  constructor(private readonly params: ResolverParams) {
    const { tokens, callbacks, config, objectParsers, linter } = params;

    this.tokens = tokens;
    this.callbacks = callbacks;
    this.config = config;
    this.objectParsers = objectParsers;
    this.linter = linter;

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

  private resolveError(refPath: RefPath, error: Error, value: string): Error {
    this.resolved.set(refPath, error);
    this.callbacks?.onError?.(refPath, error, value);
    this.graph.addNode(refPath, []);
    this.earlyResolved.push(refPath);
    return error;
  }

  private lintTokenResult(tokenName: RefPath, value: InterpreterResult): void {
    if (!this.linter) return;

    // Skip linting sub-fields (internal tokens for structured token resolution)
    if (this.subFieldPaths.has(tokenName)) return;

    const tokenData = this.tokens.get(tokenName);
    const tokenType =
      tokenData && typeof tokenData === "object" && "$type" in tokenData
        ? tokenData.$type
        : undefined;

    const ast = this.tokenInterpreter.getTokenAST(tokenName);

    try {
      const issues = this.linter.lintResult({
        tokenName,
        tokenType,
        result: value,
        allTokens: this.tokens as Map<string, TokenData>,
        resolvedTokens: this.referenceCache,
        config: this.config,
        ast,
      });

      this.lintIssues.push(...issues);
    } catch (error) {
      // If a validator throws, log the error but don't crash the resolution process
      console.error(`Linting failed for token '${tokenName}':`, error);
    }
  }

  private earlyResolvePrimitiveToken(tokenName: RefPath, value: InterpreterResult): void {
    this.resolved.set(tokenName, value);
    this.referenceCache.set(tokenName, value);
    this.callbacks?.onResolve?.(tokenName, value);
    this.lintTokenResult(tokenName, value);
    this.graph.addNode(tokenName, []);
    this.earlyResolved.push(tokenName);
  }

  private tryParseExpression(refPath: RefPath, value: string): ParseExpressionResult | Error {
    try {
      return parseExpression(value);
    } catch (error) {
      if (isLanguageError(error)) {
        return this.resolveError(refPath, error, value);
      }
      return this.resolveError(
        refPath,
        new Error("Unknown parsing error", { cause: error }),
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

      if (!this.referenceCache.has(dep)) {
        const error = new ProcessorError(ProcessorErrorCode.TOKEN_NOT_FOUND, {
          data: { tokenName: dep },
        });
        this.resolveError(dep, error, "");
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
      unresolved: this.unresolved,
      subFieldPaths: this.subFieldPaths,
      lintIssues: this.linter ? this.lintIssues : undefined,
    };
  }

  // Expose internal state for incremental updates
  public getGraph(): DependencyGraph<RefPath> {
    return this.graph;
  }

  public getReferenceCache(): Map<string, InterpreterResult> {
    return this.referenceCache;
  }

  public clone(overrides: Partial<ResolverParams>): PrefixResolver {
    const { tokens, callbacks, linter } = {
      ...this.params,
      ...overrides,
    };

    const resolver = new PrefixResolver({
      tokens,
      callbacks,
      config: this.config,
      objectParsers: this.objectParsers,
      linter,
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
      const tokenSymbol = createTokenSymbol(tokenValue, tokenType, this.config, this.objectParsers);
      this.resolved.set(tokenName, tokenSymbol);
      this.referenceCache.set(tokenName, tokenSymbol);

      this.callbacks?.onResolve?.(tokenName, tokenSymbol);
      this.lintTokenResult(tokenName, tokenSymbol);
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
   */
  private extractSubFieldMetadata(subFieldPath: RefPath): {
    parentToken: string;
    fieldPath: string;
  } {
    // Find the parent token by checking which structured token this sub-field belongs to
    for (const [parentToken] of this.structuredTokens) {
      if (subFieldPath.startsWith(`${parentToken}.`)) {
        const fieldPath = subFieldPath.substring(parentToken.length + 1);
        return { parentToken, fieldPath };
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
    } else {
      tokenValue = this.tokenInterpreter.interpretToken(tokenName, tokenValueStr);
      this.resolved.set(tokenName, tokenValue);

      if (tokenValue instanceof Error) {
        this.callbacks?.onError?.(tokenName, tokenValue, tokenValueStr);
      } else {
        this.callbacks?.onResolve?.(tokenName, tokenValue);
        this.lintTokenResult(tokenName, tokenValue);
        this.tokenInterpreter.updateReferenceCache(tokenName, tokenValue);
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
        this.callbacks?.onError?.(tokenName, error, String(originalValue));
        hasError = true;
        break;
      }
      if (fieldValue instanceof Error) {
        // Sub-field has error, propagate to parent
        this.resolved.set(tokenName, fieldValue);
        this.callbacks?.onError?.(tokenName, fieldValue, String(originalValue));
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
      );
      this.resolved.set(tokenName, tokenSymbol);
      this.referenceCache.set(tokenName, tokenSymbol);

      this.callbacks?.onResolve?.(tokenName, tokenSymbol);
      this.lintTokenResult(tokenName, tokenSymbol);
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
          ? new DependencyError(child, parent, parentValue)
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

    for (const tokenName of this.tokens.keys()) {
      const originalValue = this.tokens.get(tokenName);
      if (originalValue === undefined || this.resolved.has(tokenName)) continue;

      const tokenValueStr: string = String(getTokenValue(originalValue));

      // Check for dependency errors
      const unresolved = this.unresolved.get(tokenName);
      if (unresolved) {
        const dependencyError = this.tokenInterpreter.buildDependencyError(
          tokenName,
          unresolved.dependencies,
          this.resolved,
        );
        if (dependencyError) {
          this.resolved.set(tokenName, dependencyError);
          this.callbacks?.onError?.(tokenName, dependencyError, tokenValueStr);
          this.resolveVirtualChildren(tokenName, []);
          this.notifyResolution(tokenName);
          this.unresolved.delete(tokenName);
          continue;
        }
      }

      unresolvedTokens.push(tokenName);
    }

    if (unresolvedTokens.length > 0) {
      throw new ProcessorError(ProcessorErrorCode.CIRCULAR_DEPENDENCY, {
        data: { tokens: unresolvedTokens },
      });
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
    linter?: LintRunner,
  ): ProcessorResult {
    const resolver = new PrefixResolver({
      tokens,
      callbacks,
      config,
      objectParsers,
      linter,
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
      throw new Error("TokenResolver.getTokenDependencyGraph() can only be called after build()");
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
    const errors: TokenErrorMap = new Map();
    let subFieldPaths: Set<RefPath> | undefined;

    const callbacks: ProcessorCallbacks = {
      onResolve: (tokenName, value) => {
        output.set(tokenName, value);
      },
      onError: (tokenName, error, originalValue) => {
        output.set(tokenName, originalValue);
        errors.set(tokenName, error);
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
    subFieldPaths = result.subFieldPaths;

    // Filter out sub-field paths from output
    if (subFieldPaths && subFieldPaths.size > 0) {
      for (const subFieldPath of subFieldPaths) {
        output.delete(subFieldPath);
        errors.delete(subFieldPath);
      }
    }

    return {
      ...result,
      tokens: output,
      errors,
      resolver: this,
    };
  }

  /**
   * Update a single token and recompute only affected tokens.
   *
   * This method provides efficient incremental updates by:
   * 1. Using the existing resolver's cached reference values
   * 2. Only reprocessing the updated token and its dependents
   * 3. Reusing resolved values for unaffected tokens
   *
   * @param tokenName - Name of the token to update (empty string allowed)
   * @param tokenValue - New value for the token
   * @param tokenType - Type of the token (e.g., "color", "dimension", etc.)
   * @returns The resolved value and dependency subgraph
   *
   * @example
   * const { resolver } = new TokenResolver().build(allTokens);
   * const result = resolver.updateToken("color.primary", "#FF0000", "color");
   * console.log(result.resolvedValue); // Resolved value for color.primary
   */
  public updateToken(params: UpdateTokenParams): UpdateTokenResult {
    if (!this.prefixResolver || !this.tokens) {
      throw new Error("TokenResolver.updateToken() can only be called after build()");
    }

    const { tokenPath, tokenData } = params;

    // Normalize token name (use empty string if not provided)
    const normalizedTokenPath = tokenPath.trim() || "";

    const isRename = this.tokens.has(normalizedTokenPath);

    // Find all tokens transitively affected by this change
    const { tokens: affectedTokens, subgraph } = getTokenDependencyGraph(
      normalizedTokenPath,
      this.prefixResolver.getGraph(),
    );

    const updatedTokens = new Map(this.tokens);
    if (tokenData) {
      updatedTokens.set(normalizedTokenPath, tokenData);
    }
    this.tokens = updatedTokens;

    const output: TokenResultMap = new Map();

    const callbacks: ProcessorCallbacks = {
      onResolve: (name, value) => {
        // Only capture affected tokens in output
        if (affectedTokens.has(name)) {
          output.set(name, value);
        }
      },
      onError: (name, error) => {
        // Only capture affected tokens in output
        if (affectedTokens.has(name)) {
          output.set(name, error);
        }
      },
    };

    const newResolver = this.prefixResolver.clone({
      tokens: updatedTokens,
      callbacks,
    });
    newResolver.resolve();
    this.prefixResolver = newResolver;

    // Extract the resolved value for the updated token
    const resolvedValue = output.get(normalizedTokenPath) || "";

    return {
      resolvedValue,
      affectedTokens,
      subgraph,
      updated: isRename,
    };
  }
}
