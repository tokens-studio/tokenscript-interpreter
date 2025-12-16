import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { RefPath, ResolvedValueMap, TokenDataMap } from "@src/processor/resolver/types";

export enum LintSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * A lint issue found during token validation.
 *
 * @property code - Unique error code for this specific issue type
 * @property severity - Severity level (ERROR, WARNING, INFO)
 * @property message - Human-readable description of the issue
 * @property tokenName - The token where the issue was found
 * @property path - Path to the specific field within a structured token (e.g., ["fontSize"] or [0, "blur"] for arrays)
 * @property line - Optional line number in the source
 * @property data - Additional structured data for debugging
 */
export interface LintIssue {
  code: string;
  severity: LintSeverity;
  message: string;
  tokenName: RefPath;
  path?: (string | number)[];
  line?: number;
  data?: Record<string, unknown>;
}

/**
 * Map of token names to their lint issues.
 */
export type LintResult = Map<RefPath, LintIssue[]>;

/**
 * Context provided to lint rules during validation.
 *
 * @property tokenName - The token being validated
 * @property tokenType - Token type (e.g., "color", "opacity")
 * @property config - Interpreter configuration
 * @property allTokens - All tokens in the current set
 * @property resolvedTokens - Previously resolved tokens for cross-validation
 * @property ast - The AST of the token expression
 */
export interface LintContext {
  tokenName: RefPath;
  tokenType?: string;
  config?: Config;
  allTokens: TokenDataMap;
  resolvedTokens?: ResolvedValueMap;
  ast?: ASTNode;
}

/**
 * A lint rule that validates token values.
 *
 * @property id - Unique identifier for this rule
 * @property severity - Default severity level for issues
 * @property tokenTypes - Optional filter: only run for specific token types
 * @property validate - Validate a token value and return any issues found
 */
export interface LintRule {
  id: string;
  severity: LintSeverity;
  tokenTypes?: string[];
  validate(value: InterpreterResult, context: LintContext): LintIssue[];
}

/**
 * Linter configuration.
 *
 * @property rules - Rule overrides: false to disable, severity to override default
 */
export interface LintConfig {
  rules?: Record<string, boolean | LintSeverity>;
}

/**
 * Function to create a lint issue.
 */
export type CreateIssueFn = (issue: LintIssue) => LintIssue;
