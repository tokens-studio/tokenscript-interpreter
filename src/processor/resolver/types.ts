import type { ASTNode } from "@interpreter/ast";
import type { InterpreterResult } from "@interpreter/interpreter";

/**
 * Reference path (token name)
 */
export type RefPath = string;

/**
 * Result of token interpretation - can be a successful value or an error
 */
export type TokenResult = InterpreterResult | Error;

/**
 * Cached value in reference cache - interpretation result or error
 */
export type CachedValue = InterpreterResult | Error;

/**
 * Unresolved token data containing AST and dependency information
 */
export interface UnresolvedToken {
  ast: ASTNode;
  dependencies: Set<RefPath>;
}
