import type { ASTNode } from "@interpreter/ast";
import { Interpreter, type interpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import { DependencyError } from "./errors";
import { DependencyGraph } from "./utils/DependencyGraph";

type refPath = string;

type TokenResult = interpreterResult | Error;
type ResolvedTokens = Map<refPath, TokenResult>;
type UnresolvedToken = { ast: ASTNode; dependencies: Set<string> };
type UnresolvedTokens = Map<refPath, UnresolvedToken>;

export type ProcessorResult = {
  graph: DependencyGraph<refPath>;
  resolved: ResolvedTokens;
  unresolved: UnresolvedTokens;
};

export type ProcessorCallbacks = {
  onResolve?: (tokenName: refPath, value: interpreterResult) => void;
  onError?: (tokenName: refPath, error: Error, originalValue: string) => void;
};

export type ProcessorOutput = ProcessorResult & {
  tokens: Map<refPath, string | interpreterResult>;
  errors: Map<refPath, Error>;
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
export class TokenProcessor {
  public processTokens(
    tokens: Map<refPath, string>,
    callbacks?: ProcessorCallbacks,
  ): ProcessorResult {
    const graph = new DependencyGraph<refPath>();
    const resolved: ResolvedTokens = new Map();
    const unresolved: UnresolvedTokens = new Map();
    const { onResolve, onError } = callbacks ?? {};

    // OPTIMIZATION: Create single interpreter instance with shared references
    // The interpreter holds a LIVE REFERENCE to the resolved map, so as we
    // add new tokens, they're automatically available for reference resolution
    const sharedInterpreter = new Interpreter(null, { references: resolved });

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

    const interpretToken = (ast: ASTNode, tokenName: refPath): interpreterResult | Error => {
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
  public build(tokens: Map<refPath, string>): ProcessorOutput {
    const output: Map<refPath, string | interpreterResult> = new Map();
    const errors: Map<refPath, Error> = new Map();

    const callbacks: ProcessorCallbacks = {
      onResolve: (tokenName, value) => {
        output.set(tokenName, value);
      },
      onError: (tokenName, error, originalValue) => {
        output.set(tokenName, originalValue);
        errors.set(tokenName, error);
      },
    };

    const result = this.processTokens(tokens, callbacks);

    return {
      ...result,
      tokens: output,
      errors,
    };
  }
}
