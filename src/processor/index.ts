import type { ASTNode } from "@interpreter/ast";
import { Interpreter, type interpreterResult } from "@interpreter/interpreter";
import { type ParseExpressionResult, parseExpression } from "@interpreter/parser";
import { DependencyGraph } from "./DependencyGraph";
import { DependencyError } from "./errors";

export { DependencyError };

type refPath = string;

type TokenResult = interpreterResult | Error;
type ResolvedTokens = Map<refPath, TokenResult>;
type UnresolvedToken = { ast: ASTNode; dependencies: Set<string> };
type UnresolvedTokens = Map<refPath, UnresolvedToken>;

export class TokenProcessor {
  public processTokens(tokens: Map<refPath, string>): ResolvedTokens {
    const graph = new DependencyGraph<refPath>();
    const resolved: ResolvedTokens = new Map();
    const unresolved: UnresolvedTokens = new Map();

    const parseToken = (tokenName: string, tokenValue: string): ParseExpressionResult | Error => {
      try {
        return parseExpression(tokenValue);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        resolved.set(tokenName, error);
        graph.addNode(tokenName, []);
        return error;
      }
    };

    const interpretToken = (ast: ASTNode, tokenName: refPath): interpreterResult | Error => {
      try {
        const interpreter = new Interpreter(ast, { references: resolved });
        const result = interpreter.interpret();
        resolved.set(tokenName, result);
        return result;
      } catch (error) {
        const result = error instanceof Error ? error : new Error(String(error));
        resolved.set(tokenName, result);
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
          resolved.set(depName, new Error(`Token '${depName}' not found`));
          graph.addNode(depName, []);
        }
      }
    }

    // Get execution order (throws on circular dependencies)
    const executionOrder = graph.topologicalSort();

    // Topological sort returns dependencies-last, so iterate in reverse
    for (let i = executionOrder.length - 1; i >= 0; i--) {
      const tokenName = executionOrder[i];
      if (resolved.has(tokenName)) continue;

      const tokenData = unresolved.get(tokenName);
      if (!tokenData) continue;

      // Prefer optimistic path by trying to compute the token before checking for dependency errors
      const result = interpretToken(tokenData.ast, tokenName);
      if (!(result instanceof Error)) continue;

      // Check if any dependencies had errors
      const resolvedValue = resolved.get(tokenName);
      if (resolvedValue instanceof Error) {
        for (const depName of tokenData.dependencies) {
          const depValue = resolved.get(depName);
          if (depValue instanceof Error) {
            resolved.set(tokenName, new DependencyError(tokenName, depName, depValue));
            break;
          }
        }
      }
    }

    return resolved;
  }
}
