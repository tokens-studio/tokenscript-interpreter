import type { ASTNode } from "@interpreter/ast";
import { ReferenceNode } from "@interpreter/ast";
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
import {
  DependencyTracker,
  PrefixManager,
  ReadinessTracker,
  type RefPath,
  ResolutionNotifier,
  TokenInterpreter,
  type TokenResult,
  type UnresolvedToken,
} from ".";

type ResolvedTokens = Map<RefPath, TokenResult>;
type UnresolvedTokens = Map<RefPath, UnresolvedToken>;

/**
 * Walk an AST and replace all references to oldName with newName
 */
function replaceReferencesInAST(ast: ASTNode, oldName: string, newName: string): void {
  if (ast.nodeType === "ReferenceNode") {
    const refNode = ast as ReferenceNode;
    if (refNode.value === oldName) {
      refNode.value = newName;
      refNode.token.value = newName;
    }
    return;
  }

  // Walk all properties that could contain AST nodes
  for (const key in ast) {
    const value = (ast as any)[key];
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object" && "nodeType" in item) {
            replaceReferencesInAST(item, oldName, newName);
          }
        }
      } else if ("nodeType" in value) {
        replaceReferencesInAST(value, oldName, newName);
      }
    }
  }
}

/**
 * Reconstruct a token value string from an AST
 */
function astToString(ast: ASTNode): string {
  switch (ast.nodeType) {
    case "ReferenceNode": {
      const node = ast as ReferenceNode;
      return `{${node.value}}`;
    }
    case "StringNode": {
      const node = ast as any;
      return node.value;
    }
    case "NumNode": {
      const node = ast as any;
      return String(node.value);
    }
    case "BooleanNode": {
      const node = ast as any;
      return String(node.value);
    }
    case "NullNode": {
      return "null";
    }
    case "BinOpNode": {
      const node = ast as any;
      const left = astToString(node.left);
      const right = astToString(node.right);
      return `${left} ${node.op} ${right}`;
    }
    case "UnaryOpNode": {
      const node = ast as any;
      const expr = astToString(node.expr);
      return `${node.op}${expr}`;
    }
    case "ListNode":
    case "ImplicitListNode": {
      const node = ast as any;
      const elements = node.elements.map((e: ASTNode) => astToString(e));
      return node.isImplicit ? elements.join(" ") : `[${elements.join(", ")}]`;
    }
    case "FunctionCallNode": {
      const node = ast as any;
      const args = node.args.map((arg: ASTNode) => astToString(arg));
      return `${node.name}(${args.join(", ")})`;
    }
    case "ElementWithUnitNode": {
      const node = ast as any;
      const value = astToString(node.astNode);
      return `${value}${node.unit}`;
    }
    case "HexColorNode": {
      const node = ast as any;
      return node.value;
    }
    case "IdentifierNode": {
      const node = ast as any;
      return node.name;
    }
    case "AttributeAccessNode": {
      const node = ast as any;
      const left = astToString(node.left);
      const right = astToString(node.right);
      return `${left}.${right}`;
    }
    default:
      // For complex nodes, return the original token value if available
      return ast.token?.value || "";
  }
}

export type ProcessorResult = {
  graph: DependencyGraph<RefPath>;
  resolved: ResolvedTokens;
  unresolved: UnresolvedTokens;
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
  tokens: Map<RefPath, InterpreterResult>;
  errors: Map<RefPath, Error>;
  resolver: TokenResolver;
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
  tokenName: string,
  graph: DependencyGraph<string>,
): {
  tokens: Set<string>;
  subgraph: DependencyGraph<string>;
} {
  // Build reverse dependency graph to find dependents
  const reverseDeps = new Map<string, Set<string>>();
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
  const affectedTokens = new Set<string>();
  const queue: string[] = [tokenName];
  const visited = new Set<string>();

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
  const subgraph = new DependencyGraph<string>();
  for (const token of affectedTokens) {
    const dependencies = graphNodes.get(token);
    if (dependencies) {
      // Only include dependencies that are also in the affected set
      const affectedDeps = new Set<string>();
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
  private readonly callbacks?: ProcessorCallbacks;
  private readonly config?: Config;
  private readonly objectParsers?: ObjectParser[];
  private readonly linter?: LintRunner;
  private readonly graph = new DependencyGraph<RefPath>();
  private readonly resolved: ResolvedTokens = new Map();
  private readonly unresolved: UnresolvedTokens = new Map();
  private readonly referenceCache: Map<string, InterpreterResult> = new Map();
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
  private readonly structuredTokens: Map<RefPath, TokenData> = new Map();

  // Lint issues collection
  private readonly lintIssues: LintIssue[] = [];

  // Phase state
  private earlyResolved: RefPath[] = [];

  constructor(
    private readonly tokens: Map<RefPath, string | TokenData>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    objectParsers?: ObjectParser[],
    linter?: LintRunner,
  ) {
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
  private resolver?: PrefixResolver;
  private tokens?: Map<RefPath, TokenData>;
  private config?: Config;
  private objectParsers?: ObjectParser[];

  public processTokens(
    tokens: Map<RefPath, string | TokenData>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    objectParsers?: ObjectParser[],
    linter?: LintRunner,
  ): ProcessorResult {
    const resolver = new PrefixResolver(tokens, callbacks, config, objectParsers, linter);
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
  public getTokenDependencyGraph(tokenName: string): {
    tokens: Set<string>;
    subgraph: DependencyGraph<string>;
  } {
    if (!this.resolver) {
      throw new Error("TokenResolver.getTokenDependencyGraph() can only be called after build()");
    }

    const graph = this.resolver.getGraph();

    // Build reverse dependency graph to find dependents
    const reverseDeps = new Map<string, Set<string>>();
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
    const affectedTokens = new Set<string>();
    const queue: string[] = [tokenName];
    const visited = new Set<string>();

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
    const subgraph = new DependencyGraph<string>();
    for (const token of affectedTokens) {
      const dependencies = graphNodes.get(token);
      if (dependencies) {
        // Only include dependencies that are also in the affected set
        const affectedDeps = new Set<string>();
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
    tokens: Map<RefPath, TokenData>,
    config?: Config,
    objectParsers?: ObjectParser[],
  ): ProcessorOutput {
    const output: Map<RefPath, string | InterpreterResult> = new Map();
    const errors: Map<RefPath, Error> = new Map();
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
    this.resolver = new PrefixResolver(tokens, callbacks, config, objectParsers);
    this.tokens = tokens;
    this.config = config;
    this.objectParsers = objectParsers;

    const result = this.resolver.resolve();
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
   * Create a new token.
   *
   * @param params - Object with token configuration
   * @param params.name - Name of the token to create
   * @param params.value - Value for the token
   * @param params.type - Type of the token (e.g., "color", "dimension", etc.)
   * @returns The resolved value for the new token
   *
   * @throws Error if token already exists
   *
   * @example
   * const { resolver } = new TokenResolver().build(allTokens);
   * const result = resolver.createToken({
   *   name: "color.secondary",
   *   value: "#00FF00",
   *   type: "color"
   * });
   */
  public createToken(params: {
    name: string;
    value?: string;
    type?: string;
  }): {
    resolvedValue: InterpreterResult | Error;
  } {
    if (!this.resolver || !this.tokens) {
      throw new Error("TokenResolver.createToken() can only be called after build()");
    }

    const { name, value = "", type = "string" } = params;
    const normalizedTokenName = name.trim();

    // Check if token already exists
    if (this.tokens.has(normalizedTokenName)) {
      throw new Error(`Token "${normalizedTokenName}" already exists`);
    }

    // Add the token to the tokens map
    const updatedTokens = new Map(this.tokens);
    updatedTokens.set(normalizedTokenName, {
      $value: value,
      $type: type,
    });

    // Update stored tokens
    this.tokens = updatedTokens;

    // Process the new token
    const output: Map<RefPath, InterpreterResult | Error> = new Map();

    const callbacks: ProcessorCallbacks = {
      onResolve: (tokenName, tokenValue) => {
        output.set(tokenName, tokenValue);
      },
      onError: (tokenName, error) => {
        output.set(tokenName, error);
      },
    };

    // Create a new resolver with ALL tokens and pre-populated cache
    const tempResolver = new PrefixResolverWithCache(
      updatedTokens,
      this.resolver.getReferenceCache(),
      callbacks,
      this.config,
      this.objectParsers,
    );
    tempResolver.resolve();

    // Update the main resolver
    this.resolver = tempResolver;

    // Extract the resolved value for the new token
    const resolvedValue = output.get(normalizedTokenName) || "";

    return {
      resolvedValue,
    };
  }

  /**
   * Delete a token.
   *
   * @param params - Object with token configuration
   * @param params.name - Name of the token to delete
   * @returns Information about broken references created by this deletion
   *
   * @example
   * const { resolver } = new TokenResolver().build(allTokens);
   * const result = resolver.deleteToken({ name: "color.primary" });
   * console.log(result.brokenReferences); // Tokens that depended on color.primary
   */
  public deleteToken(params: {
    name: string;
  }): {
    brokenReferences: Set<string>;
  } {
    if (!this.resolver || !this.tokens) {
      throw new Error("TokenResolver.deleteToken() can only be called after build()");
    }

    const { name } = params;
    const normalizedTokenName = name.trim();

    // Find all tokens that depend on this token
    const { tokens: affectedTokens } = getTokenDependencyGraph(
      normalizedTokenName,
      this.resolver.getGraph(),
    );

    // Remove the deleted token itself from the affected set
    affectedTokens.delete(normalizedTokenName);
    const brokenReferences = affectedTokens;

    // Remove the token from the tokens map
    const updatedTokens = new Map(this.tokens);
    updatedTokens.delete(normalizedTokenName);

    // Update stored tokens
    this.tokens = updatedTokens;

    // Process tokens with the deleted token removed
    const callbacks: ProcessorCallbacks = {};

    // Create a new resolver without the deleted token
    const tempResolver = new PrefixResolverWithCache(
      updatedTokens,
      new Map(), // Start with empty cache since we deleted a token
      callbacks,
      this.config,
      this.objectParsers,
    );
    tempResolver.resolve();

    // Update the main resolver
    this.resolver = tempResolver;

    return {
      brokenReferences,
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
   * @param params - Object with token update configuration
   * @param params.prevToken - Previous token information
   * @param params.prevToken.name - Previous name of the token
   * @param params.prevToken.value - Previous value (optional)
   * @param params.prevToken.type - Previous type (optional)
   * @param params.token - New token information
   * @param params.token.name - New name for the token
   * @param params.token.value - New value (optional, defaults to empty string)
   * @param params.token.type - New type (optional, defaults to "string")
   * @param params.updateReferences - Whether to update references when name changes
   * @returns The resolved value and dependency information
   *
   * @throws Error if trying to rename to an existing token name
   *
   * @example
   * const { resolver } = new TokenResolver().build(allTokens);
   * const result = resolver.updateToken({
   *   prevToken: { name: "color.primary" },
   *   token: { name: "color.primary", value: "#FF0000", type: "color" },
   *   updateReferences: false
   * });
   * console.log(result.resolvedValue); // Resolved value for color.primary
   */
  public updateToken(params: {
    prevToken: { name: string; value?: string; type?: string };
    token: { name: string; value?: string; type?: string };
    updateReferences: boolean;
  }): {
    resolvedValue: InterpreterResult | Error;
    affectedTokens: Set<string>;
    subgraph: DependencyGraph<string>;
    brokenReferences?: Set<string>;
  } {
    if (!this.resolver || !this.tokens) {
      throw new Error("TokenResolver.updateToken() can only be called after build()");
    }

    const {
      prevToken,
      token,
      updateReferences,
    } = params;

    const prevTokenName = prevToken.name.trim();
    const newTokenName = token.name.trim();
    const tokenValue = token.value || "";
    const tokenType = token.type || "string";

    const isRename = prevTokenName !== newTokenName;

    // Check if trying to rename to an existing token
    if (isRename && this.tokens.has(newTokenName)) {
      throw new Error(`Cannot rename to "${newTokenName}": token already exists`);
    }

    let updatedTokens = new Map(this.tokens);
    let brokenReferences: Set<string> | undefined;

    if (isRename) {
      // Find all tokens that reference the old name
      const { tokens: dependentTokens } = getTokenDependencyGraph(
        prevTokenName,
        this.resolver.getGraph(),
      );

      // Remove the token itself from the dependent set
      dependentTokens.delete(prevTokenName);

      if (updateReferences) {
        // Update all references in dependent tokens using the AST parser
        for (const depTokenName of dependentTokens) {
          const depToken = updatedTokens.get(depTokenName);
          if (depToken) {
            const depValue = getTokenValue(depToken);
            if (typeof depValue === "string") {
              try {
                // Parse the token value to get its AST
                const parseResult = parseExpression(depValue);
                if (parseResult.ast) {
                  // Replace references in the AST
                  replaceReferencesInAST(parseResult.ast, prevTokenName, newTokenName);
                  // Reconstruct the token value from the modified AST
                  const updatedValue = astToString(parseResult.ast);
                  updatedTokens.set(depTokenName, setTokenValue(depToken, updatedValue));
                }
              } catch (error) {
                // If parsing fails, leave the token unchanged
                console.error(`Failed to update references in token '${depTokenName}':`, error);
              }
            }
          }
        }
      } else {
        // Track broken references
        brokenReferences = dependentTokens;
      }

      // Remove old token and add new one
      updatedTokens.delete(prevTokenName);
      updatedTokens.set(newTokenName, {
        $value: tokenValue,
        $type: tokenType,
      });
    } else {
      // Simple update without rename
      updatedTokens.set(newTokenName, {
        $value: tokenValue,
        $type: tokenType,
      });
    }

    // Update stored tokens
    this.tokens = updatedTokens;

    // Find all tokens transitively affected by this change
    const { tokens: affectedTokens, subgraph } = getTokenDependencyGraph(
      newTokenName,
      this.resolver.getGraph(),
    );

    // Pass ALL tokens to the resolver
    const output: Map<RefPath, InterpreterResult | Error> = new Map();

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

    // Create a new resolver with ALL tokens and pre-populated cache
    const tempResolver = new PrefixResolverWithCache(
      updatedTokens,
      this.resolver.getReferenceCache(),
      callbacks,
      this.config,
      this.objectParsers,
    );
    tempResolver.resolve();

    // Update the main resolver
    this.resolver = tempResolver;

    // Extract the resolved value for the updated token
    const resolvedValue = output.get(newTokenName) || "";

    return {
      resolvedValue,
      affectedTokens,
      subgraph,
      brokenReferences,
    };
  }
}

// Helper class that extends PrefixResolver to accept pre-populated cache
class PrefixResolverWithCache extends PrefixResolver {
  constructor(
    tokens: Map<RefPath, string | TokenData>,
    cachedValues: Map<RefPath, InterpreterResult>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    objectParsers?: ObjectParser[],
  ) {
    super(tokens, callbacks, config, objectParsers);

    // Pre-populate the reference cache with already-resolved values
    for (const [tokenName, value] of cachedValues) {
      if (!tokens.has(tokenName)) {
        this.getReferenceCache().set(tokenName, value);
      }
    }
  }

  // Expose reference cache for initialization
  public getReferenceCache(): Map<string, InterpreterResult> {
    return (this as any).referenceCache;
  }
}
