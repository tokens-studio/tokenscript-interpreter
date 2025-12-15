import { LintRunner } from "../../LintRunner";
import type { TokenTypeValidatorMap } from "../../rules/TypeBasedRule";
import { TypeBasedRule } from "../../rules/TypeBasedRule";
import { rules as cssRules } from "../css/rules";
import { letterSpacingValidator } from "./letter-spacing";
import { shadowValidator } from "./shadow";
import { strokeWidthValidator } from "./stroke-width";
import { typographyValidator } from "./typography";

/**
 * Penpot token type to validator mapping.
 *
 * Extends CSS rules with Penpot-specific validators.
 * Override validators replace CSS validators for the same token type.
 */
export const rules: TokenTypeValidatorMap = {
  ...cssRules,

  // Penpot-specific overrides
  typography: typographyValidator,
  shadow: shadowValidator,
  letterSpacing: letterSpacingValidator,

  // Penpot additions
  strokeWidth: strokeWidthValidator,
  "stroke-width": strokeWidthValidator,
};

/**
 * Creates a pre-configured LintRunner with all Penpot rules.
 *
 * Penpot rules extend CSS rules with application-specific validators:
 * - Typography uses Penpot's value types (unitless line-height, text-case, etc.)
 * - Shadow uses Penpot's structure (non-negative blur/spread)
 * - Adds stroke-width support
 *
 * @example
 * import { penpot, all } from "@tokenscript/processor/linter/presets";
 *
 * // Use Penpot rules as-is
 * const linter = penpot.createLintRunner();
 *
 * // Extend with additional custom validators
 * const customLinter = penpot.createLintRunner().extend({
 *   "border-radius": all(penpot.rules["border-radius"], customValidator),
 * });
 */
export function createLintRunner(): LintRunner {
  return new LintRunner().addRule(new TypeBasedRule(rules));
}
