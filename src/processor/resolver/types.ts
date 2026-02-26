import type { ASTNode } from "@interpreter/ast";
import type { LanguageError } from "@interpreter/errors";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { DependencyGraph } from "../utils/DependencyGraph";
import type { TokenData } from "../utils/tokens";
import type { ValidationIssue } from "../validator";

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
 * Can be a validation issue or a language error (lexer/parser/interpreter/processor).
 */
export type ResolveIssue = ValidationIssue | LanguageError;
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
  /** Skip re-resolution of dependent tokens. Useful for preview-only scenarios
   *  where only the changed token's resolved value is needed. */
  skipDependents?: boolean;
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

export type ResolveValueParams = {
  /** The raw token value expression to resolve (e.g. "{baseColors.red}", "16 * 2", "#ff0000") */
  value: unknown;
  /** Token type hint for type-aware resolution (e.g. "color", "dimension") */
  type?: string;
};

export type ResolveValueResult = {
  /** The resolved value (ISymbolType, string, Error, etc.) */
  resolved: InterpreterResult;
  /** Resolution issues (parse errors, missing references, etc.) */
  issues: ResolveIssue[];
};
