import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { isLanguageError, ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import type { InterpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import { BooleanSymbol, NullSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { isArray, isBoolean, isNull, isNumber, isObject, isString } from "@interpreter/utils/type";
import { UNINTERPRETED_KEYWORDS } from "@src/types";
import { DependencyError } from "../errors";
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

export type ProcessorResult = {
  graph: DependencyGraph<RefPath>;
  resolved: ResolvedTokens;
  unresolved: UnresolvedTokens;
  subFieldPaths?: Set<RefPath>;
};

export type ProcessorCallbacks = {
  onResolve?: (tokenName: RefPath, value: InterpreterResult) => void;
  onError?: (tokenName: RefPath, error: Error, originalValue: string) => void;
};

export type ProcessorOutput = ProcessorResult & {
  tokens: Map<RefPath, InterpreterResult>;
  errors: Map<RefPath, Error>;
};

class PrefixResolver {
  private readonly callbacks?: ProcessorCallbacks;
  private readonly config?: Config;
  private readonly objectParsers?: ObjectParser[];
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

  // Phase state
  private earlyResolved: RefPath[] = [];

  constructor(
    private readonly tokens: Map<RefPath, string | TokenData>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    objectParsers?: ObjectParser[],
  ) {
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

  private resolveError(refPath: RefPath, error: Error, value: string): Error {
    this.resolved.set(refPath, error);
    this.callbacks?.onError?.(refPath, error, value);
    this.graph.addNode(refPath, []);
    this.earlyResolved.push(refPath);
    return error;
  }

  private earlyResolvePrimitiveToken(tokenName: RefPath, value: InterpreterResult): void {
    this.resolved.set(tokenName, value);
    this.referenceCache.set(tokenName, value);
    this.callbacks?.onResolve?.(tokenName, value);
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
    };
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
    const stringFields = extractStringFields(tokenValue, tokenName);

    if (stringFields.size === 0) {
      // No string fields to resolve, token is ready
      // Create TokenSymbol and store it in both resolved and reference cache
      const tokenType = tokenData.$type || "unknown";
      const tokenSymbol = createTokenSymbol(tokenValue, tokenType, this.config, this.objectParsers);
      this.resolved.set(tokenName, tokenSymbol);
      this.referenceCache.set(tokenName, tokenSymbol);

      this.callbacks?.onResolve?.(tokenName, tokenSymbol);
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
          this.callbacks?.onError?.(tokenName, dependencyError, "");
        } else {
          const tokenValue = this.tokenInterpreter.interpretTokenWithAST(tokenName, ast);
          this.resolved.set(tokenName, tokenValue);

          if (tokenValue instanceof Error) {
            this.callbacks?.onError?.(tokenName, tokenValue, "");
          } else {
            this.callbacks?.onResolve?.(tokenName, tokenValue);
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
    const stringFields = extractStringFields(originalValue, tokenName);

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
  public processTokens(
    tokens: Map<RefPath, string | TokenData>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    objectParsers?: ObjectParser[],
  ): ProcessorResult {
    const resolver = new PrefixResolver(tokens, callbacks, config, objectParsers);
    return resolver.resolve();
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

    const result = this.processTokens(tokens, callbacks, config, objectParsers);
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
    };
  }
}
