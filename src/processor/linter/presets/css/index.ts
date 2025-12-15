/**
+ * CSS Preset Validators
+ *
+ * Exports follow a consistent pattern:
+ * - `fooValidator` - TokenTypeValidator for use with TypeBasedRule
+ * - `foo` - Raw ValueValidator for composition with combinators
+ * - `FOO_VALUES` - Constants for allowed values (where applicable)
+ */

// CSS property validators (TokenTypeValidator)
// Raw ValueValidators for composition
export { borderRadius, borderRadiusValidator } from "./border-radius";
export {
  boxShadow,
  boxShadowSingle,
  boxShadowSingleValidator,
  boxShadowValidator,
} from "./box-shadow";
export { fontFamily, fontFamilyValidator } from "./font-family";
export { CSS_FONT_WEIGHT_KEYWORDS, fontWeight, fontWeightValidator } from "./font-weight";
export { letterSpacing, letterSpacingValidator } from "./letter-spacing";
export { lineHeight, lineHeightValidator } from "./line-height";
export { opacity, opacityValidator } from "./opacity";
// LintRunner factory and rules map
export { createLintRunner, rules } from "./rules";
export {
  CSS_TEXT_DECORATION_LINE_VALUES,
  textDecorationLine,
  textDecorationLineValidator,
} from "./text-decoration";
export { CSS_TEXT_TRANSFORM_VALUES, textTransform, textTransformValidator } from "./text-transform";
// Constants
export {
  CSS_LENGTH_UNITS,
  length,
  lengthNonNegative,
  lengthNonNegativeValidator,
  lengthValidator,
} from "./utils/length";
export {
  lengthPercentage,
  lengthPercentageNonNegative,
  lengthPercentageNonNegativeValidator,
  lengthPercentageValidator,
} from "./utils/length-percentage";
export {
  percentage,
  percentageNonNegative,
  percentageNonNegativeValidator,
  percentageValidator,
} from "./utils/percentage";
