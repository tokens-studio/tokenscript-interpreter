import { or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { number, string } from "../validators/primitives";
import { lengthPercentageNonNegative } from "./length-percentage";

/**
 * CSS line-height: normal | <number> | <length> | <percentage>
 * https://developer.mozilla.org/en-US/docs/Web/CSS/line-height
 *
 * - "normal" - browser default (typically 1.2)
 * - <number> - unitless multiplier (recommended)
 * - <length> - absolute length
 * - <percentage> - percentage of font-size
 *
 * All numeric values must be non-negative.
 */
export const lineHeight = or(
  string({ allowedValues: ["normal"] }),
  number({ min: 0 }), // Unitless multiplier
  lengthPercentageNonNegative,
);

export const lineHeightValidator = createValidator(lineHeight);
