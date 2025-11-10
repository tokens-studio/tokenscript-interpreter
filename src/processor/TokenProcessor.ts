import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { Interpreter, type interpreterResult } from "@interpreter/interpreter";
import {
  type ParseExpressionResult,
  parseExpression,
} from "@interpreter/parser";
import {
  DictionarySymbol,
  NullSymbol,
  StringSymbol,
} from "@interpreter/symbols";
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

    const parseToken = (
      tokenName: string,
      tokenValue: string,
    ): ParseExpressionResult | Error => {
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

    const interpretToken = (
      ast: ASTNode,
      tokenName: RefPath,
    ): interpreterResult | Error => {
      const originalValue = tokens.get(tokenName) ?? "";
      try {
        // OPTIMIZATION: Reuse interpreter, just swap AST
        // This avoids creating a new Interpreter instance for each token
        sharedInterpreter.setAst(ast);
        const result = sharedInterpreter.interpret();
        resolved.set(tokenName, result);
        onResolve?.(tokenName, result);
        return result;
      } catch (error) {
        const result =
          error instanceof Error ? error : new Error(String(error));
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
    prefixDebug("build-requirements", { tokenCount: this.tokens.size });
    this.buildRequirementsGraph();
    this.mapToRequiredByPrefixes();
    this.resolveDependencyFreeTokens();
    this.finalizeResolution();
    return {
      graph: this.graph,
      resolved: this.resolved,
      unresolved: this.unresolved,
    };
  }

  private buildRequirementsGraph(): void {
    for (const [tokenName, tokenValue] of this.tokens.entries()) {
      prefixDebug("parse-token", { tokenName });

      if (UNINTERPRETED_KEYWORDS.includes(tokenValue)) {
        const symbol = new StringSymbol(tokenValue, this.config);
        this.resolved.set(tokenName, symbol);
        this.updateReferenceCache(tokenName, symbol);
        this.callbacks?.onResolve?.(tokenName, symbol);
        this.graph.addNode(tokenName, []);
        this.notifyResolution(tokenName);
        continue;
      }

      let parseResult: ParseExpressionResult;
      try {
        parseResult = parseExpression(tokenValue);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        prefixDebug("parse-error", { tokenName, message: err.message });
        this.resolved.set(tokenName, err);
        this.callbacks?.onError?.(tokenName, err, tokenValue);
        this.graph.addNode(tokenName, []);
        this.notifyResolution(tokenName);
        continue;
      }

      const { ast, parser } = parseResult;
      if (!ast) {
        this.resolved.set(tokenName, "");
        this.updateReferenceCache(tokenName, "");
        this.callbacks?.onResolve?.(tokenName, "");
        this.graph.addNode(tokenName, []);
        this.notifyResolution(tokenName);
        continue;
      }

      this.astNodes.set(tokenName, ast);
      this.addToPrefixes(tokenName);

      const dependencies = new Set(parser.requiredReferences);
      if (dependencies.size > 0) {
        this.unresolved.set(tokenName, {
          ast,
          dependencies: new Set(dependencies),
        });
      }

      this.graph.addNode(tokenName, dependencies);

      for (const dep of dependencies) {
        if (this.allPrefixes.has(dep)) {
          this.addToSetMap(this.requiredPrefixesMap, dep, tokenName);
          continue;
        }

        if (this.resolved.has(dep)) {
          continue;
        }

        this.addToSetMap(this.requiresTokens, tokenName, dep);
        this.addToSetMap(this.requiredByTokens, dep, tokenName);

        if (this.tokens.has(dep)) {
          continue;
        }

        const parentToken = this.findParentToken(dep);
        if (parentToken && this.tokens.has(parentToken)) {
          this.addToSetMap(this.virtualChildren, parentToken, dep);
          continue;
        }

        if (
          !this.referenceCache.has(dep) &&
          !this.resolved.has(dep)
        ) {
          const error = new Error(`Token '${dep}' not found`);
          prefixDebug("missing-token", {
            dependency: dep,
            requiredBy: tokenName,
          });
          this.resolved.set(dep, error);
          this.callbacks?.onError?.(dep, error, "");
          this.graph.addNode(dep, []);
          this.notifyResolution(dep);
        }
      }
    }
  }

  private mapToRequiredByPrefixes(): void {
    for (const [prefix, tokens] of this.requiredPrefixesMap.entries()) {
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

    const resolvedNames = Array.from(this.resolved.keys());
    for (const resolvedName of resolvedNames) {
      this.releasePrefixes(resolvedName);
    }
  }

  private resolveDependencyFreeTokens(): void {
    for (const tokenName of this.tokens.keys()) {
      if (this.resolved.has(tokenName)) continue;
      const waitsForTokens = this.requiresTokens.get(tokenName);
      const waitsForPrefixes = this.tokensToRequiredPrefixes.get(tokenName);
      if (
        (waitsForTokens && waitsForTokens.size > 0) ||
        (waitsForPrefixes && waitsForPrefixes.size > 0)
      ) {
        continue;
      }
      this.resolveSingleToken(tokenName);
    }
  }

  private resolveSingleToken(tokenName: RefPath): void {
    if (!this.tokens.has(tokenName)) {
      return;
    }

    if (!this.resolved.has(tokenName)) {
      const ast = this.astNodes.get(tokenName);
      const originalValue = this.tokens.get(tokenName) ?? "";
      const dependencyError = this.buildDependencyError(tokenName);
      if (dependencyError) {
        this.resolved.set(tokenName, dependencyError);
        prefixDebug("dependency-error", {
          tokenName,
          chain: dependencyError.dependencyChain,
        });
        this.callbacks?.onError?.(tokenName, dependencyError, originalValue);
      } else if (!ast) {
        this.resolved.set(tokenName, originalValue);
        this.callbacks?.onResolve?.(tokenName, originalValue);
        this.updateReferenceCache(tokenName, originalValue);
      } else {
        try {
          prefixDebug("interpret-token", { tokenName });
          this.interpreter.setAst(ast);
          const result = this.interpreter.interpret();
          this.resolved.set(tokenName, result);
          this.callbacks?.onResolve?.(tokenName, result);
          this.updateReferenceCache(tokenName, result);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          prefixDebug("interpret-error", { tokenName, message: err.message });
          this.resolved.set(tokenName, err);
          this.callbacks?.onError?.(tokenName, err, originalValue);
        }
      }
    }

    const tokenValue = this.resolved.get(tokenName);
    if (tokenValue === undefined) return;

    const flattened = this.flattenIfDictionary(tokenName, tokenValue);
    this.notifyResolution(tokenName);
    for (const name of flattened) {
      this.notifyResolution(name);
    }
    this.resolveVirtualChildren(tokenName, flattened);

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

  private flattenIfDictionary(
    tokenName: RefPath,
    value: TokenResult,
  ): RefPath[] {
    if (!(value instanceof DictionarySymbol)) {
      return [];
    }

    const flattenedNames: RefPath[] = [];
    const entries = value.value;
    if (!entries) return flattenedNames;

    for (const [childKey, childValue] of entries.entries()) {
      const flattenedKey = `${tokenName}.${childKey}`;
      const clone = this.isSymbolType(childValue)
        ? childValue.cloneIfMutable()
        : childValue;
      this.referenceCache.set(flattenedKey, clone);
      flattenedNames.push(flattenedKey);
    }

    return flattenedNames;
  }

  private resolveVirtualChildren(parent: RefPath, flattened: RefPath[]): void {
    const children = this.virtualChildren.get(parent);
    if (!children || children.size === 0) return;

    const satisfied = new Set(flattened);
    const parentValue = this.resolved.get(parent);

    for (const child of children) {
      if (satisfied.has(child) || this.referenceCache.has(child)) {
        continue;
      }

      if (this.resolved.has(child)) {
        continue;
      }

      let error: Error;
      if (parentValue instanceof Error) {
        error = new DependencyError(child, parent, parentValue);
      } else {
        error = new Error(`Token '${child}' not found`);
      }

      this.resolved.set(child, error);
      this.callbacks?.onError?.(child, error, "");
      this.notifyResolution(child);
    }

    this.virtualChildren.delete(parent);
  }

  private notifyResolution(name: RefPath): void {
    this.releaseDependents(name);
    this.releasePrefixes(name);
  }

  private releaseDependents(name: RefPath): void {
    const dependents = this.requiredByTokens.get(name);
    if (!dependents) return;
    for (const dependent of dependents) {
      const deps = this.requiresTokens.get(dependent);
      if (!deps) continue;
      deps.delete(name);
      if (deps.size === 0 && !this.tokensToRequiredPrefixes.has(dependent)) {
        this.requiresTokens.delete(dependent);
        this.resolveSingleToken(dependent);
      }
    }
    this.requiredByTokens.delete(name);
  }

  private releasePrefixes(name: RefPath): void {
    const prefixes = this.requiredByPrefixes.get(name);
    if (!prefixes) return;
    for (const prefix of prefixes) {
      const prefixSet = this.requiredPrefixes.get(prefix);
      if (!prefixSet) continue;
      prefixSet.delete(name);
      if (prefixSet.size === 0) {
        this.requiredPrefixes.delete(prefix);
        this.releasePrefix(prefix);
      }
    }
    this.requiredByPrefixes.delete(name);
  }

  private releasePrefix(prefix: string): void {
    prefixDebug("free-prefix", { prefix });
    const prefixedTokens = this.allPrefixes.get(prefix);
    if (!prefixedTokens) return;

    const dictionaryEntries = new Map<string, ISymbolType>();
    for (const tokenName of prefixedTokens) {
      const shortName = tokenName.split(".").pop();
      if (!shortName) continue;
      const referenceValue = this.referenceCache.get(tokenName);
      const symbol = this.toSymbol(referenceValue);
      if (!symbol) continue;
      dictionaryEntries.set(shortName, symbol.cloneIfMutable());
    }

    if (dictionaryEntries.size > 0) {
      const dictionary = new DictionarySymbol(dictionaryEntries, this.config);
      this.referenceCache.set(prefix, dictionary);
    }

    const waitingTokens = this.requiredPrefixesMap.get(prefix);
    if (!waitingTokens) return;

    for (const tokenName of waitingTokens) {
      const prefixes = this.tokensToRequiredPrefixes.get(tokenName);
      if (!prefixes) continue;
      prefixes.delete(prefix);
      if (prefixes.size === 0) {
        this.tokensToRequiredPrefixes.delete(tokenName);
        const remainingDeps = this.requiresTokens.get(tokenName);
        if (!remainingDeps || remainingDeps.size === 0) {
          this.resolveSingleToken(tokenName);
        }
      }
    }
  }

  private updateReferenceCache(tokenName: RefPath, value: TokenResult): void {
    if (value instanceof Error) return;
    this.referenceCache.set(tokenName, value);
  }

  private finalizeResolution(): void {
    const unresolvedTokens: RefPath[] = [];
    for (const tokenName of this.tokens.keys()) {
      if (!this.resolved.has(tokenName)) {
        const dependencyError = this.buildDependencyError(tokenName);
        if (dependencyError) {
          this.resolved.set(tokenName, dependencyError);
          this.callbacks?.onError?.(tokenName, dependencyError, this.tokens.get(tokenName) ?? "");
          this.notifyResolution(tokenName);
          this.resolveVirtualChildren(tokenName, []);
          this.requiresTokens.delete(tokenName);
          this.unresolved.delete(tokenName);
          continue;
        }
        unresolvedTokens.push(tokenName);
      }
    }

    if (unresolvedTokens.length > 0) {
      const message = `Detected circular dependency or unresolved prefixes: ${unresolvedTokens.join(", ")}`;
      prefixDebug("unresolved", { tokens: unresolvedTokens });
      throw new Error(message);
    }
  }

  private addToPrefixes(tokenName: RefPath): void {
    const segments = tokenName.split(".");
    if (segments.length <= 1) return;

    for (let i = 1; i < segments.length; i++) {
      const prefix = segments.slice(0, i).join(".");
      this.addToSetMap(this.allPrefixes, prefix, tokenName);
    }
  }

  private findParentToken(reference: RefPath): RefPath | undefined {
    const segments = reference.split(".");
    for (let i = segments.length - 1; i > 0; i--) {
      const candidate = segments.slice(0, i).join(".");
      if (this.tokens.has(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }

  private addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    if (!map.has(key)) {
      map.set(key, new Set<V>());
    }
    map.get(key)!.add(value);
  }

  private isSymbolType(value: TokenResult | undefined): value is ISymbolType {
    if (!value || typeof value !== "object") return false;
    return typeof (value as ISymbolType).cloneIfMutable === "function";
  }

  private toSymbol(value: TokenResult | undefined): ISymbolType | undefined {
    if (!value) return undefined;
    if (this.isSymbolType(value)) return value;
    if (typeof value === "string") {
      return new StringSymbol(value, this.config);
    }
    if (value === null) {
      return new NullSymbol(this.config);
    }
    return undefined;
  }
}

const PREFIX_DEBUG_LABEL = "[TokenProcessor][prefix]";
function prefixDebug(message: string, payload?: Record<string, unknown>): void {
  // if (payload) {
  //   console.log(`${PREFIX_DEBUG_LABEL} ${message}`, payload);
  // } else {
  //   console.log(`${PREFIX_DEBUG_LABEL} ${message}`);
  // }
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
