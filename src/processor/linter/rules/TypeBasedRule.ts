import type { InterpreterResult } from "@interpreter/interpreter";
import type { CreateIssueFn, LintContext, LintIssue } from "../types";
import { LintSeverity } from "../types";
import { BaseLintRule } from "./base";

export type TokenTypeValidator = (
  value: InterpreterResult,
  context: LintContext,
  createIssue: CreateIssueFn,
) => LintIssue[];

export class TypeBasedRule extends BaseLintRule {
  id = "type-validation";
  severity = LintSeverity.ERROR;

  private validators: Map<string, TokenTypeValidator> = new Map();
  private defaultValidator?: TokenTypeValidator;

  forType(tokenType: string, validator: TokenTypeValidator): this {
    this.validators.set(tokenType, validator);
    return this;
  }

  forDefault(validator: TokenTypeValidator): this {
    this.defaultValidator = validator;
    return this;
  }

  validate(value: InterpreterResult, context: LintContext): LintIssue[] {
    const tokenType = context.tokenType;
    if (!tokenType) return [];

    const validator = this.validators.get(tokenType) ?? this.defaultValidator;
    if (!validator) return [];

    return validator(value, context, this.createIssue.bind(this));
  }
}
