import { or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { number, string } from "../validators/primitives";

/**
 * CSS font-weight keywords
 */
export const CSS_FONT_WEIGHT_KEYWORDS = ["normal", "bold", "lighter", "bolder"];

/**
 * CSS font-weight: <number> 1-1000 or keywords
 * https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
 *
 * Numeric values:
 * - 100-900 are the traditional font weights
 * - CSS Fonts Level 4 extends this to 1-1000
 *
 * Keywords:
 * - normal = 400
 * - bold = 700
 * - lighter/bolder = relative to parent
 */
export const fontWeight = or(
  number({ min: 1, max: 1000 }),
  string({ allowedValues: CSS_FONT_WEIGHT_KEYWORDS }),
);

export const fontWeightValidator = createValidator(fontWeight);
