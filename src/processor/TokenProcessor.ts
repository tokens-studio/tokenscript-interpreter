import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { Interpreter, type interpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import { DictionarySymbol, NullSymbol, StringSymbol } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import { UNINTERPRETED_KEYWORDS } from "@src/types";
import { DependencyError } from "./errors";
import { DependencyGraph } from "./utils/DependencyGraph";

type RefPath = string;

type TokenResult = interpreterResult | Error;
type ResolvedTokens = Map<RefPath, TokenResult>;
type UnresolvedToken = { ast: ASTNode; dependencies: Set<string> };
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
  private readonly requiresTokens = new Map<RefPath, Set<RefPath>>();
  private readonly requiredByTokens = new Map<RefPath, Set<RefPath>>();
  private readonly requiredPrefixesMap = new Map<string, Set<RefPath>>();
  private readonly tokensToRequiredPrefixes = new Map<RefPath, Set<string>>();
  private readonly requiredByPrefixes = new Map<RefPath, Set<string>>();
  private readonly requiredPrefixes = new Map<string, Set<RefPath>>();
  private readonly astNodes = new Map<RefPath, ASTNode>();
  private readonly allPrefixes = new Map<string, Set<RefPath>>();
  private readonly referenceCache: Map<string, TokenResult> = new Map();
  private readonly virtualChildren = new Map<RefPath, Set<RefPath>>();
  private readonly interpreter: Interpreter;
  private readonly pendingResolution: Set<RefPath> = new Set();

  constructor(
    private readonly tokens: Map<RefPath, string>,
    callbacks?: ProcessorCallbacks,
    config?: Config,
  ) {
    this.callbacks = callbacks;
    this.config = config;
    this.interpreter = new Interpreter(null, {
      references: this.referenceCache as Map<string, any>,
      config,
    });
  }

  public resolve(): ProcessorResult {
    const earlyResolved = this.buildRequirementsGraph();
    this.mapToRequiredByPrefixes();
    this.releaseEarlyResolved(earlyResolved);
    this.resolveDependencyFreeTokens();
    this.finalizeResolution();
    return {
      graph: this.graph,
      resolved: this.resolved,
      unresolved: this.unresolved,
    };
  }

  private buildRequirementsGraph(): RefPath[] {
    const earlyResolved: RefPath[] = [];

    for (const [tokenName, tokenValue] of this.tokens.entries()) {
      if (UNINTERPRETED_KEYWORDS.includes(tokenValue)) {
        const symbol = new StringSymbol(tokenValue, this.config);
        this.resolved.set(tokenName, symbol);
        this.referenceCache.set(tokenName, symbol);
        this.callbacks?.onResolve?.(tokenName, symbol);
        this.graph.addNode(tokenName, []);
        earlyResolved.push(tokenName);
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
        earlyResolved.push(tokenName);
        continue;
      }

      const { ast, parser } = parseResult;
      if (!ast) {
        this.resolved.set(tokenName, "");
        this.referenceCache.set(tokenName, "");
        this.callbacks?.onResolve?.(tokenName, "");
        this.graph.addNode(tokenName, []);
        earlyResolved.push(tokenName);
        continue;
      }

      this.astNodes.set(tokenName, ast);
      this.addToPrefixes(tokenName);

      const dependencies = parser.requiredReferences;
      if (dependencies.size > 0) {
        this.unresolved.set(tokenName, { ast, dependencies });
      }

      this.graph.addNode(tokenName, dependencies);

      for (const dep of dependencies) {
        if (this.allPrefixes.has(dep) && !this.tokens.has(dep)) {
          this.addToSetMap(this.requiredPrefixesMap, dep, tokenName);
          continue;
        }

        if (this.resolved.has(dep)) continue;

        this.addToSetMap(this.requiresTokens, tokenName, dep);
        this.addToSetMap(this.requiredByTokens, dep, tokenName);

        if (this.tokens.has(dep)) continue;

        const parentToken = this.findParentToken(dep);
        if (parentToken) {
          this.addToSetMap(this.virtualChildren, parentToken, dep);
          continue;
        }

        if (!this.referenceCache.has(dep)) {
          const error = new Error(`Token '${dep}' not found`);
          this.resolved.set(dep, error);
          this.callbacks?.onError?.(dep, error, "");
          this.graph.addNode(dep, []);
          earlyResolved.push(dep);
        }
      }
    }

    return earlyResolved;
  }

  private mapToRequiredByPrefixes(): void {
    for (const [prefix, tokens] of this.requiredPrefixesMap) {
      const prefixedTokens = this.allPrefixes.get(prefix);
      if (!prefixedTokens) continue;

      for (const token of prefixedTokens) {
        this.addToSetMap(this.requiredByPrefixes, token, prefix);
        this.addToSetMap(this.requiredPrefixes, prefix, token);
      }

      for (const token of tokens) {
        this.addToSetMap(this.tokensToRequiredPrefixes, token, prefix);
      }
    }
  }

  private releaseEarlyResolved(earlyResolved: RefPath[]): void {
    for (const tokenName of earlyResolved) {
      this.releaseDependents(tokenName);
      this.releasePrefixes(tokenName);
    }
  }

  private resolveDependencyFreeTokens(): void {
    const ready: RefPath[] = [];
    for (const tokenName of this.tokens.keys()) {
      if (this.resolved.has(tokenName)) continue;
      const waitsForTokens = this.requiresTokens.get(tokenName);
      const waitsForPrefixes = this.tokensToRequiredPrefixes.get(tokenName);
      if (
        (!waitsForTokens || waitsForTokens.size === 0) &&
        (!waitsForPrefixes || waitsForPrefixes.size === 0)
      ) {
        ready.push(tokenName);
      }
    }
    for (const tokenName of ready) {
      this.resolveSingleToken(tokenName);
    }
  }

  private resolveSingleToken(tokenName: RefPath): void {
    const originalValue = this.tokens.get(tokenName);
    if (originalValue === undefined || this.resolved.has(tokenName)) return;

    const ast = this.astNodes.get(tokenName);
    const dependencyError = this.buildDependencyError(tokenName);

    let tokenValue: TokenResult;

    if (dependencyError) {
      tokenValue = dependencyError;
      this.resolved.set(tokenName, dependencyError);
      this.callbacks?.onError?.(tokenName, dependencyError, originalValue);
    } else if (!ast) {
      tokenValue = originalValue;
      this.resolved.set(tokenName, originalValue);
      this.callbacks?.onResolve?.(tokenName, originalValue);
      this.referenceCache.set(tokenName, originalValue);
    } else {
      try {
        this.interpreter.resetSymbolTable();
        this.interpreter.setAst(ast);
        tokenValue = this.interpreter.interpret();
        this.resolved.set(tokenName, tokenValue);
        this.callbacks?.onResolve?.(tokenName, tokenValue);
        if (!(tokenValue instanceof Error)) {
          this.referenceCache.set(tokenName, tokenValue);
        }
      } catch (error) {
        tokenValue = error instanceof Error ? error : new Error(String(error));
        this.resolved.set(tokenName, tokenValue);
        this.callbacks?.onError?.(tokenName, tokenValue as Error, originalValue);
      }
    }

    const flattened = this.flattenIfDictionary(tokenName, tokenValue);
    this.resolveVirtualChildren(tokenName, flattened);
    this.notifyResolution(tokenName, flattened);
    this.requiresTokens.delete(tokenName);
    this.unresolved.delete(tokenName);
  }

  private buildDependencyError(tokenName: RefPath): DependencyError | undefined {
    const meta = this.unresolved.get(tokenName);
    if (!meta) return undefined;
    for (const dep of meta.dependencies) {
      const depValue = this.resolved.get(dep);
      if (depValue instanceof Error) {
        return new DependencyError(tokenName, dep, depValue);
      }
    }
    return undefined;
  }

  private flattenIfDictionary(tokenName: RefPath, value: TokenResult): RefPath[] {
    if (!(value instanceof DictionarySymbol) || !value.value) {
      return [];
    }

    const flattenedNames: RefPath[] = [];
    const entries = value.value;

    for (const [childKey, childValue] of entries) {
      const flattenedKey = `${tokenName}.${childKey}`;
      const clone = this.isSymbolType(childValue) ? childValue.cloneIfMutable() : childValue;
      this.referenceCache.set(flattenedKey, clone);
      flattenedNames.push(flattenedKey);
    }

    return flattenedNames;
  }

  private resolveVirtualChildren(parent: RefPath, flattened: RefPath[]): void {
    const children = this.virtualChildren.get(parent);
    if (!children || children.size === 0) return;

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

    this.virtualChildren.delete(parent);
  }

  private notifyResolution(name: RefPath, flattened?: RefPath[]): void {
    this.releaseDependents(name);
    this.releasePrefixes(name);
    if (flattened) {
      for (const flatName of flattened) {
        this.releaseDependents(flatName);
        this.releasePrefixes(flatName);
      }
    }
  }

  private releaseDependents(name: RefPath): void {
    const dependents = this.requiredByTokens.get(name);
    if (!dependents) return;

    for (const dependent of dependents) {
      if (this.pendingResolution.has(dependent)) continue;

      const deps = this.requiresTokens.get(dependent);
      if (!deps) continue;

      deps.delete(name);
      if (deps.size === 0) {
        const waitingPrefixes = this.tokensToRequiredPrefixes.get(dependent);
        if (!waitingPrefixes || waitingPrefixes.size === 0) {
          this.requiresTokens.delete(dependent);
          this.pendingResolution.add(dependent);
          this.resolveSingleToken(dependent);
          this.pendingResolution.delete(dependent);
        }
      }
    }
    this.requiredByTokens.delete(name);
  }

  private releasePrefixes(name: RefPath): void {
    const prefixes = this.requiredByPrefixes.get(name);
    if (!prefixes) return;

    for (const prefix of prefixes) {
      const prefixSet = this.requiredPrefixes.get(prefix);
      if (prefixSet) {
        prefixSet.delete(name);
        if (prefixSet.size === 0) {
          this.requiredPrefixes.delete(prefix);
          this.releasePrefix(prefix);
        }
      }
    }
    this.requiredByPrefixes.delete(name);
  }

  private releasePrefix(prefix: string): void {
    const prefixedTokens = this.allPrefixes.get(prefix);
    if (!prefixedTokens) return;

    const dictionaryEntries = new Map<string, ISymbolType>();
    const prefixLen = prefix.length + 1;

    for (const tokenName of prefixedTokens) {
      const shortName = tokenName.slice(prefixLen);
      if (!shortName.includes(".")) {
        const referenceValue = this.referenceCache.get(tokenName);
        const symbol = this.toSymbol(referenceValue);
        if (symbol) {
          dictionaryEntries.set(shortName, symbol.cloneIfMutable());
        }
      }
    }

    if (dictionaryEntries.size > 0) {
      this.referenceCache.set(prefix, new DictionarySymbol(dictionaryEntries, this.config));
    }

    const waitingTokens = this.requiredPrefixesMap.get(prefix);
    if (!waitingTokens) return;

    for (const tokenName of waitingTokens) {
      if (this.pendingResolution.has(tokenName)) continue;

      const prefixes = this.tokensToRequiredPrefixes.get(tokenName);
      if (!prefixes) continue;

      prefixes.delete(prefix);
      if (prefixes.size === 0) {
        this.tokensToRequiredPrefixes.delete(tokenName);
        const remainingDeps = this.requiresTokens.get(tokenName);
        if (!remainingDeps || remainingDeps.size === 0) {
          this.pendingResolution.add(tokenName);
          this.resolveSingleToken(tokenName);
          this.pendingResolution.delete(tokenName);
        }
      }
    }
  }

  private finalizeResolution(): void {
    let changed = true;
    while (changed) {
      changed = false;
      const unresolvedTokens: RefPath[] = [];

      for (const tokenName of this.tokens.keys()) {
        const originalValue = this.tokens.get(tokenName);
        if (originalValue === undefined || this.resolved.has(tokenName)) continue;

        const waitsForTokens = this.requiresTokens.get(tokenName);
        const waitsForPrefixes = this.tokensToRequiredPrefixes.get(tokenName);

        if (
          (!waitsForTokens || waitsForTokens.size === 0) &&
          (!waitsForPrefixes || waitsForPrefixes.size === 0)
        ) {
          this.resolveSingleToken(tokenName);
          changed = true;
          continue;
        }

        const dependencyError = this.buildDependencyError(tokenName);
        if (dependencyError) {
          this.resolved.set(tokenName, dependencyError);
          this.callbacks?.onError?.(tokenName, dependencyError, originalValue);
          this.resolveVirtualChildren(tokenName, []);
          this.notifyResolution(tokenName);
          this.requiresTokens.delete(tokenName);
          this.unresolved.delete(tokenName);
          changed = true;
        } else {
          unresolvedTokens.push(tokenName);
        }
      }

      if (!changed && unresolvedTokens.length > 0) {
        throw new Error(
          `Detected circular dependency or unresolved prefixes: ${unresolvedTokens.join(", ")}`,
        );
      }
    }
  }

  private addToPrefixes(tokenName: RefPath): void {
    let dotIndex = tokenName.indexOf(".");
    if (dotIndex === -1) return;

    while (dotIndex !== -1) {
      const prefix = tokenName.slice(0, dotIndex);
      this.addToSetMap(this.allPrefixes, prefix, tokenName);
      dotIndex = tokenName.indexOf(".", dotIndex + 1);
    }
  }

  private findParentToken(reference: RefPath): RefPath | undefined {
    let lastDotIndex = reference.lastIndexOf(".");
    while (lastDotIndex > 0) {
      const candidate = reference.slice(0, lastDotIndex);
      if (this.tokens.has(candidate)) {
        return candidate;
      }
      lastDotIndex = reference.lastIndexOf(".", lastDotIndex - 1);
    }
    return undefined;
  }

  private addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    let set = map.get(key);
    if (!set) {
      set = new Set<V>();
      map.set(key, set);
    }
    set.add(value);
  }

  private isSymbolType(value: any): value is ISymbolType {
    return value && typeof value === "object" && typeof value.cloneIfMutable === "function";
  }

  private toSymbol(value: TokenResult | undefined): ISymbolType | undefined {
    if (!value) return undefined;
    if (this.isSymbolType(value)) return value;
    if (typeof value === "string") return new StringSymbol(value, this.config);
    if (value === null) return new NullSymbol(this.config);
    return undefined;
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
