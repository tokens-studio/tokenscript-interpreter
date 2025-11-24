import type { InterpreterResult } from "@interpreter/interpreter";
import type { CreateIssueFn, LintContext, LintIssue, LintRule, LintSeverity } from "../types";

export abstract class BaseLintRule implements LintRule {
  abstract id: string;
  abstract severity: LintSeverity;
  tokenTypes?: string[];

  abstract validate(value: InterpreterResult, context: LintContext): LintIssue[];

  protected createIssue: CreateIssueFn = (
    context: LintContext,
    code: string,
    message: string,
    data?: Record<string, unknown>,
    severity?: LintSeverity,
    line?: number,
  ): LintIssue => {
    return {
      ruleId: this.id,
      code,
      severity: severity ?? this.severity,
      message,
      tokenName: context.tokenName,
      line,
      data,
    };
  };
}
