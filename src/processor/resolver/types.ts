import type { ASTNode } from "@interpreter/ast";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { LintIssue } from "../linter";
import type { DependencyGraph } from "../utils/DependencyGraph";
import type { TokenData } from "../utils/tokens";

// Utilities -------------------------------------------------------------------

/**
 * Reference path (token name delimited by `.`)
 */
export type RefPath = string;

// Storage ---------------------------------------------------------------------

export type TokenInputMap = Map<RefPath, string | TokenData>;

export type TokenDataMap = Map<RefPath, TokenData>;

export type ResolvedValueMap = Map<RefPath, InterpreterResult>;

export interface UnresolvedToken {
  ast: ASTNode;
  dependencies: Set<RefPath>;
}
export type UnresolvedTokenMap = Map<RefPath, UnresolvedToken>;

export type ASTNodeMap = Map<RefPath, ASTNode>;

// Results ---------------------------------------------------------------------

export type TokenResult = InterpreterResult | Error;
export type TokenResultMap = Map<RefPath, TokenResult>;
export type TokenErrorMap = Map<RefPath, Error>;

// Issues ----------------------------------------------------------------------

/**
 * An issue found during token resolution.
 * Can be a lint issue, a language error (lexer/parser/interpreter/processor),
 * or a general error (e.g., DependencyError).
 */
export type ResolveIssue = LintIssue | Error;
export type IssuesMap = Map<RefPath, ResolveIssue[]>;

// Crud ------------------------------------------------------------------------

export type TokenOperationBase = {
  tokenPath: RefPath;
};

export type CreateTokenParams = TokenOperationBase & {
  tokenData: TokenData;
};

export type UpdateTokenParams = TokenOperationBase & {
  tokenData?: TokenData;
  tokenPathRenamed?: RefPath;
  updateReferences?: boolean;
};

export type DeleteTokenParams = TokenOperationBase;

// Crud Results ----------------------------------------------------------------

export type TokenOperationResult = {
  tokens: ResolvedValueMap;
  resolved?: InterpreterResult;
  issues?: IssuesMap;
  dependants?: {
    graph: DependencyGraph<RefPath>;
  };
};

export type CreateTokenResult = TokenOperationResult & {
  created: boolean;
};

export type UpdateTokenResult = TokenOperationResult & {
  updated: boolean;
};

export type DeleteTokenResult = TokenOperationResult;
