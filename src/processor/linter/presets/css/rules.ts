import { LintRunner } from "../../LintRunner";
import type { TokenTypeValidatorMap } from "../../rules/TypeBasedRule";
import { TypeBasedRule } from "../../rules/TypeBasedRule";
import { borderRadiusValidator } from "./border-radius";
import { boxShadowValidator } from "./box-shadow";
import { fontFamilyValidator } from "./font-family";
import { fontWeightValidator } from "./font-weight";
import { letterSpacingValidator } from "./letter-spacing";
import { lineHeightValidator } from "./line-height";
import { opacityValidator } from "./opacity";
import { textDecorationLineValidator } from "./text-decoration";
import { textTransformValidator } from "./text-transform";
import { lengthNonNegativeValidator } from "./utils/length";

/**
 * CSS token type to validator mapping.
 *
 * Maps token types to their CSS-spec compliant validators.
 * This can be used directly with TypeBasedRule or extended for
 * application-specific validation.
 */
export const rules: TokenTypeValidatorMap = {
  // Dimension tokens
  "border-radius": borderRadiusValidator,
  borderRadius: borderRadiusValidator,
  spacing: lengthNonNegativeValidator,
  sizing: lengthNonNegativeValidator,

  // Typography tokens
  fontFamily: fontFamilyValidator,
  fontWeight: fontWeightValidator,
  lineHeight: lineHeightValidator,
  letterSpacing: letterSpacingValidator,
  textDecoration: textDecorationLineValidator,
  textCase: textTransformValidator,

  // Other tokens
  opacity: opacityValidator,
  shadow: boxShadowValidator,
  boxShadow: boxShadowValidator,
};

/**
 * Creates a pre-configured LintRunner with all CSS rules.
 *
 * Use this as a base and extend with application-specific validators:
 *
 * @example
 * import { css, all } from "@tokenscript/processor/linter/presets";
 *
 * // Use CSS rules as-is
 * const linter = css.createLintRunner();
 *
 * // Extend with custom validators
 * const penpotLinter = css.createLintRunner().extend({
 *   "border-radius": all(css.borderRadius, customValidator),
 *   "stroke-width": penpot.strokeWidthValidator,
 * });
 */
export function createLintRunner(): LintRunner {
  return new LintRunner().addRule(new TypeBasedRule(rules));
}
