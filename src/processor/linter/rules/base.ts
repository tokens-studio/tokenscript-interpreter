import type { InterpreterResult } from "@interpreter/interpreter";
import type { CreateIssueFn, LintContext, LintIssue, LintRule, LintSeverity } from "../types";

export abstract class BaseLintRule implements LintRule {
  abstract id: string;
  abstract severity: LintSeverity;
  tokenTypes?: string[];

  abstract validate(value: InterpreterResult, context: LintContext): LintIssue[];

  protected createIssue: CreateIssueFn = (issue: LintIssue): LintIssue => issue;
}
