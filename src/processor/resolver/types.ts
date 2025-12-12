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
  resolvedValue: TokenResult;
  affectedTokens: Set<RefPath>;
  subgraph: DependencyGraph<RefPath>;
  lintIssues?: LintIssue[];
};

export type CreateTokenResult = TokenOperationResult & {
  created: boolean;
};

export type UpdateTokenResult = TokenOperationResult & {
  updated: boolean;
  renamedReferences?: Set<RefPath>;
  brokenReferences?: Set<RefPath>;
};

export type DeleteTokenResult = {
  affectedTokens: Set<RefPath>;
  subgraph: DependencyGraph<RefPath>;
  brokenReferences: Set<RefPath>;
  lintIssues?: LintIssue[];
};
