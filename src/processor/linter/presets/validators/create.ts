import type { TokenTypeValidator } from "../../rules/TypeBasedRule";
import { LintSeverity } from "../../types";
import type { ValidatorContext, ValueValidator } from "../types";

/**
 * Wraps a ValueValidator to create a TokenTypeValidator for use with TypeBasedRule.
 *
 * @param validator - The value validator to wrap
 * @param options - Options for the wrapper
 *
 * @example
 * import { number, createValidator } from "@tokenscript/processor/linter/presets";
 *
 * const opacityValidator = createValidator(number({ min: 0, max: 1 }));
 *
 * const linter = new LintRunner().addRule(
 *   new TypeBasedRule().forType("opacity", opacityValidator)
 * );
 */
export function createValidator(
  validator: ValueValidator,
  options?: { severity?: LintSeverity },
): TokenTypeValidator {
  const defaultSeverity = options?.severity ?? LintSeverity.ERROR;

  return (value, context, createIssue) => {
    const ctx: ValidatorContext = {
      tokenName: context.tokenName,
      path: [],
      severity: defaultSeverity,
    };

    const result = validator(value, ctx);

    if (result === null) return null;

    // Wrap issues through createIssue to maintain compatibility
    const issues = Array.isArray(result) ? result : [result];
    return issues.map((iss) => createIssue(iss));
  };
}
