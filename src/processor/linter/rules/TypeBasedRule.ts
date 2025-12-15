import type { InterpreterResult } from "@interpreter/interpreter";
import { ensureArray } from "@interpreter/utils/type";
import type { CreateIssueFn, LintContext, LintIssue } from "../types";
import { LintSeverity } from "../types";
import { BaseLintRule } from "./base";

export type TokenTypeValidator = (
  value: InterpreterResult,
  context: LintContext,
  createIssue: CreateIssueFn,
) => LintIssue | LintIssue[] | null | undefined;

export type TokenTypeValidatorMap = Record<string, TokenTypeValidator>;

export class TypeBasedRule extends BaseLintRule {
  id = "type-validation";
  severity = LintSeverity.ERROR;

  private validators: Map<string, TokenTypeValidator> = new Map();
  private defaultValidator?: TokenTypeValidator;

  constructor(validators?: TokenTypeValidatorMap) {
    super();
    if (validators) {
      for (const [type, validator] of Object.entries(validators)) {
        this.validators.set(type, validator);
      }
    }
  }

  forType(tokenType: string, validator: TokenTypeValidator): this {
    this.validators.set(tokenType, validator);
    return this;
  }

  forDefault(validator: TokenTypeValidator): this {
    this.defaultValidator = validator;
    return this;
  }

  /**
   * Returns a copy of the internal validator map.
   * Useful for extending rules.
   */
  getValidators(): Map<string, TokenTypeValidator> {
    return new Map(this.validators);
  }

  /**
   * Returns the default validator, if set.
   */
  getDefaultValidator(): TokenTypeValidator | undefined {
    return this.defaultValidator;
  }

  validate(value: InterpreterResult, context: LintContext): LintIssue[] {
    const tokenType = context.tokenType;
    if (!tokenType) return [];

    const validator = this.validators.get(tokenType) ?? this.defaultValidator;
    if (!validator) return [];

    const result = validator(value, context, this.createIssue);
    return ensureArray(result);
  }
}
