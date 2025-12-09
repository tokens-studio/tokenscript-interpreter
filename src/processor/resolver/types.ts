import type { ASTNode } from "@interpreter/ast";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { TokenData } from "../utils/tokens";

/**
 * Reference path (token name delimited by `.`)
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

/**
 * Map of token names to their raw input values (string or structured TokenData)
 */
export type TokenInputMap = Map<RefPath, string | TokenData>;

/**
 * Map of token names to structured TokenData objects
 */
export type TokenDataMap = Map<RefPath, TokenData>;

/**
 * Map of token names to resolved interpreter results
 */
export type ResolvedValueMap = Map<RefPath, InterpreterResult>;

/**
 * Map of token names to resolution results (value or error)
 */
export type TokenResultMap = Map<RefPath, TokenResult>;

/**
 * Map of token names to errors
 */
export type TokenErrorMap = Map<RefPath, Error>;

/**
 * Map of token names to unresolved token data
 */
export type UnresolvedTokenMap = Map<RefPath, UnresolvedToken>;

/**
 * Map of token names to AST nodes
 */
export type ASTNodeMap = Map<RefPath, ASTNode>;
