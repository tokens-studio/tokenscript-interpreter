import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { TokenData } from "@src/processor/utils/tokens";

export enum LintSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

export interface LintIssue {
  ruleId: string;
  code: string;
  severity: LintSeverity;
  message: string;
  tokenName: string;
  line?: number;
  data?: Record<string, unknown>;
}

export interface LintResult {
  issues: LintIssue[];
  errors: LintIssue[];
  warnings: LintIssue[];
  hasErrors: boolean;
}

export interface LintContext {
  tokenName: string;
  tokenType?: string;
  config?: Config;
  allTokens: Map<string, TokenData>;
  resolvedTokens?: Map<string, InterpreterResult>;
  ast?: ASTNode;
}

export interface LintRule {
  id: string;
  severity: LintSeverity;
  tokenTypes?: string[];
  validate(value: InterpreterResult, context: LintContext): LintIssue[];
}

export interface LintConfig {
  rules?: Record<string, boolean | LintSeverity>;
}

export type CreateIssueFn = (
  context: LintContext,
  code: string,
  message: string,
  data?: Record<string, unknown>,
  severity?: LintSeverity,
  line?: number,
) => LintIssue;
