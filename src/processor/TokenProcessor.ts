import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { Interpreter, type interpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import { StringSymbol } from "@interpreter/symbols";
import { UNINTERPRETED_KEYWORDS } from "@src/types";
import { DependencyError } from "./errors";
import {
  DependencyTracker,
  PrefixExtractor,
  PrefixManager,
  ReadinessTracker,
  ResolutionNotifier,
  ResolutionPhase,
  type RefPath,
  TokenInterpreter,
  type TokenResult,
  type UnresolvedToken,
} from "./resolver";
import { DependencyGraph } from "./utils/DependencyGraph";

type ResolvedTokens = Map<RefPath, TokenResult>;
type UnresolvedTokens = Map<RefPath, UnresolvedToken>;

export type ProcessorResult = {
  graph: DependencyGraph<RefPath>;
  resolved: ResolvedTokens;
  unresolved: UnresolvedTokens;
};

export type ProcessorCallbacks = {
  onResolve?: (tokenName: RefPath, value: interpreterResult) => void;
  onError?: (tokenName: RefPath, error: Error, originalValue: string) => void;
};

export type ProcessorOutput = ProcessorResult & {
  tokens: Map<RefPath, string | interpreterResult>;
  errors: Map<RefPath, Error>;
};

export type TokenProcessorMode = "prefix" | "legacy";

export type ProcessorOptions = {
  mode?: TokenProcessorMode;
};

/**
 * TokenProcessor - Resolves tokens with dependencies using topological sorting
 *
 * This implementation is optimized for performance by reusing a single Interpreter
 * instance across all token interpretations. The interpreter holds a live reference
 * to the resolved tokens map, allowing efficient reference resolution.
 *
 * Key optimizations:
 * - Single Interpreter instance reused across all tokens (~7x faster)
 * - Shared references map passed by reference to interpreter
 * - Reduced object allocations
 *
 * @example
 * const processor = new TokenProcessor();
 * const tokens = new Map([
 *   ["a", "10"],
 *   ["b", "{a} * 2"],
 * ]);
 * const result = processor.build(tokens);
 */
export class LegacyTokenProcessor {
  public processTokens(
    tokens: Map<RefPath, string>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
  ): ProcessorResult {
    const graph = new DependencyGraph<RefPath>();
    const resolved: ResolvedTokens = new Map();
    const unresolved: UnresolvedTokens = new Map();
    const { onResolve, onError } = callbacks ?? {};

    // OPTIMIZATION: Create single interpreter instance with shared references
    // The interpreter holds a LIVE REFERENCE to the resolved map, so as we
    // add new tokens, they're automatically available for reference resolution
    const sharedInterpreter = new Interpreter(null, {
      references: resolved,
      config,
    });

    const parseToken = (tokenName: string, tokenValue: string): ParseExpressionResult | Error => {
      try {
        return parseExpression(tokenValue);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        resolved.set(tokenName, error);
        onError?.(tokenName, error, tokenValue);
        graph.addNode(tokenName, []);
        return error;
      }
    };

    const interpretToken = (ast: ASTNode, tokenName: RefPath): interpreterResult | Error => {
      const originalValue = tokens.get(tokenName) ?? "";
      try {
        // OPTIMIZATION: Reuse interpreter, just swap AST
        // This avoids creating a new Interpreter instance for each token
        sharedInterpreter.resetSymbolTable();
        sharedInterpreter.setAst(ast);
        const result = sharedInterpreter.interpret();
        resolved.set(tokenName, result);
        onResolve?.(tokenName, result);
        return result;
      } catch (error) {
        const result = error instanceof Error ? error : new Error(String(error));
        resolved.set(tokenName, result);
        onError?.(tokenName, result, originalValue);
        return result;
      }
    };

    // Parse all tokens and build dependency graph
    for (const [tokenName, tokenValue] of tokens.entries()) {
      const result = parseToken(tokenName, tokenValue);
      if (result instanceof Error) continue;
      const { ast, parser } = result as ParseExpressionResult;

      // Empty node
      if (!ast) {
        resolved.set(tokenName, "");
        onResolve?.(tokenName, "");
        graph.addNode(tokenName, []);
        continue;
      }

      const dependencies = parser.requiredReferences;

      // Compute dependency free tokens
      if (dependencies.size === 0) {
        interpretToken(ast, tokenName);
        graph.addNode(tokenName, []);
        continue;
      }

      // Token has dependencies that need to be resolved first
      unresolved.set(tokenName, { ast, dependencies });
      graph.addNode(tokenName, dependencies);

      // Mark nodes with missing dependencies
      for (const depName of dependencies) {
        if (!tokens.has(depName) && !resolved.has(depName)) {
          const error = new Error(`Token '${depName}' not found`);
          resolved.set(depName, error);
          onError?.(depName, error, "");
          graph.addNode(depName, []);
        }
      }
    }

    // Get execution order (throws on circular dependencies)
    const executionOrder = graph.topologicalSort();

    // Resolve references and interpret
    // Topological sort returns dependencies-last, so iterate in reverse
    for (let i = executionOrder.length - 1; i >= 0; i--) {
      const tokenName = executionOrder[i];
      if (resolved.has(tokenName)) continue;

      const tokenData = unresolved.get(tokenName);
      if (!tokenData) continue;

      // Prefer optimistic path by trying to compute the token before checking for dependency errors
      const result = interpretToken(tokenData.ast, tokenName);
      if (!(result instanceof Error)) continue;

      // If interpretation failed, check if any dependencies had errors
      for (const depName of tokenData.dependencies) {
        const depValue = resolved.get(depName);
        if (depValue instanceof Error) {
          const depError = new DependencyError(tokenName, depName, depValue);
          resolved.set(tokenName, depError);
          const originalValue = tokens.get(tokenName) ?? "";
          onError?.(tokenName, depError, originalValue);
          break;
        }
      }
    }

    return { graph, resolved, unresolved };
  }

  /**
   * Build tokens from a flat token map
   */
  public build(tokens: Map<RefPath, string>, config?: Config): ProcessorOutput {
    const output: Map<RefPath, string | interpreterResult> = new Map();
    const errors: Map<RefPath, Error> = new Map();

    const callbacks: ProcessorCallbacks = {
      onResolve: (tokenName, value) => {
        output.set(tokenName, value);
      },
      onError: (tokenName, error, originalValue) => {
        output.set(tokenName, originalValue);
        errors.set(tokenName, error);
      },
    };

    const result = this.processTokens(tokens, callbacks, config);

    return {
      ...result,
      tokens: output,
      errors,
    };
  }
}

class PrefixAwareTokenProcessor {
  public processTokens(
    tokens: Map<RefPath, string>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
  ): ProcessorResult {
    const resolver = new PrefixResolver(tokens, callbacks, config);
    return resolver.resolve();
  }
}

class PrefixResolver {
  private readonly callbacks?: ProcessorCallbacks;
  private readonly config?: Config;
  private readonly graph = new DependencyGraph<RefPath>();
  private readonly resolved: ResolvedTokens = new Map();
  private readonly unresolved: UnresolvedTokens = new Map();
  private readonly referenceCache: Map<string, interpreterResult> = new Map();
  private readonly pendingResolution: Set<RefPath> = new Set();
  private readonly readyQueue: Set<RefPath> = new Set();

  // Core components
  private readonly dependencyTracker: DependencyTracker;
  private readonly prefixManager: PrefixManager;
  private readonly tokenInterpreter: TokenInterpreter;

  // Phase 3: Optimization components
  private readonly notifier: ResolutionNotifier;
  private readonly prefixExtractor: PrefixExtractor;
  private readonly readinessTracker: ReadinessTracker;

  // Phase state
  private earlyResolved: RefPath[] = [];

  constructor(
    private readonly tokens: Map<RefPath, string>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
  ) {
    this.callbacks = callbacks;
    this.config = config;

    // Initialize components
    this.dependencyTracker = new DependencyTracker();
    this.prefixManager = new PrefixManager(config);
    this.tokenInterpreter = new TokenInterpreter(this.referenceCache, config);

    // Initialize Phase 3 optimization components
    this.prefixExtractor = new PrefixExtractor();
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

  /**
   * Resolve tokens in phases:
   * 1. Parse and build dependency graph
   * 2. Map prefix dependencies
   * 3. Release early resolved tokens
   * 4. Resolve dependency-free tokens
   * 5. Finalize remaining resolutions
   */
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
    };
  }

  /**
   * Phase 1: Parse and build graph (ResolutionPhase.PARSE_AND_BUILD_GRAPH)
   * - Parse all token values into ASTs
   * - Build dependency graph
   * - Identify and mark early-resolved tokens
   * - Detect missing token dependencies
   */
  private parseAndBuildGraph(): void {
    this.earlyResolved = [];

    for (const [tokenName, tokenValue] of this.tokens.entries()) {
      if (UNINTERPRETED_KEYWORDS.includes(tokenValue)) {
        const symbol = new StringSymbol(tokenValue, this.config);
        this.resolved.set(tokenName, symbol);
        this.referenceCache.set(tokenName, symbol);
        this.callbacks?.onResolve?.(tokenName, symbol);
        this.graph.addNode(tokenName, []);
        this.earlyResolved.push(tokenName);
        continue;
      }

      let parseResult: ParseExpressionResult;
      try {
        parseResult = parseExpression(tokenValue);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.resolved.set(tokenName, err);
        this.callbacks?.onError?.(tokenName, err, tokenValue);
        this.graph.addNode(tokenName, []);
        this.earlyResolved.push(tokenName);
        continue;
      }

      const { ast, parser } = parseResult;
      if (!ast) {
        this.resolved.set(tokenName, "");
        this.referenceCache.set(tokenName, "");
        this.callbacks?.onResolve?.(tokenName, "");
        this.graph.addNode(tokenName, []);
        this.earlyResolved.push(tokenName);
        continue;
      }

      this.tokenInterpreter.setTokenAST(tokenName, ast);
      this.prefixManager.addTokenToPrefix(tokenName);

      const dependencies = parser.requiredReferences;
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
          const error = new Error(`Token '${dep}' not found`);
          this.resolved.set(dep, error);
          this.callbacks?.onError?.(dep, error, "");
          this.graph.addNode(dep, []);
          this.earlyResolved.push(dep);
        }
      }
    }
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
    // Seed ready queue with initially dependency-free tokens
    for (const tokenName of this.tokens.keys()) {
      if (this.resolved.has(tokenName)) continue;

      if (this.readinessTracker.isReady(tokenName, this.dependencyTracker)) {
        this.readyQueue.add(tokenName);
      }
    }

    // Process ready queue (event-driven cascade resolution)
    while (this.readyQueue.size > 0) {
      const tokenName = this.readyQueue.values().next().value;
      this.readyQueue.delete(tokenName);
      this.resolveSingleToken(tokenName);
    }
  }

  private resolveSingleToken(tokenName: RefPath): void {
    const originalValue = this.tokens.get(tokenName);
    if (originalValue === undefined || this.resolved.has(tokenName)) return;

    // Prevent re-entrant resolution during cascade
    this.pendingResolution.add(tokenName);

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
      this.callbacks?.onError?.(tokenName, dependencyError, originalValue);
    } else {
      tokenValue = this.tokenInterpreter.interpretToken(tokenName, originalValue);
      this.resolved.set(tokenName, tokenValue);

      if (tokenValue instanceof Error) {
        this.callbacks?.onError?.(tokenName, tokenValue, originalValue);
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
          : new Error(`Token '${child}' not found`);

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
  private buildPrefixDictionary(prefix: string, cache: Map<string, interpreterResult>): void {
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
          this.callbacks?.onError?.(tokenName, dependencyError, originalValue);
          this.resolveVirtualChildren(tokenName, []);
          this.notifyResolution(tokenName);
          this.unresolved.delete(tokenName);
          continue;
        }
      }

      unresolvedTokens.push(tokenName);
    }

    if (unresolvedTokens.length > 0) {
      throw new Error(
        `Detected circular dependency or unresolved prefixes: ${unresolvedTokens.join(", ")}`,
      );
    }
  }
}

export class TokenProcessor {
  private readonly legacy = new LegacyTokenProcessor();
  private readonly prefix = new PrefixAwareTokenProcessor();

  constructor(private readonly defaultMode: TokenProcessorMode = "prefix") {}

  public processTokens(
    tokens: Map<RefPath, string>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
    options?: ProcessorOptions,
  ): ProcessorResult {
    const mode = options?.mode ?? this.defaultMode;
    if (mode === "legacy") {
      return this.legacy.processTokens(tokens, callbacks, config);
    }
    return this.prefix.processTokens(tokens, callbacks, config);
  }

  public build(
    tokens: Map<RefPath, string>,
    config?: Config,
    options?: ProcessorOptions,
  ): ProcessorOutput {
    const output: Map<RefPath, string | interpreterResult> = new Map();
    const errors: Map<RefPath, Error> = new Map();

    const callbacks: ProcessorCallbacks = {
      onResolve: (tokenName, value) => {
        output.set(tokenName, value);
      },
      onError: (tokenName, error, originalValue) => {
        output.set(tokenName, originalValue);
        errors.set(tokenName, error);
      },
    };

    const result = this.processTokens(tokens, callbacks, config, options);

    return {
      ...result,
      tokens: output,
      errors,
    };
  }
}
