import { or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { number } from "../validators/primitives";
import { numberWithUnit } from "../validators/unit";

/**
 * CSS <length> units
 * https://developer.mozilla.org/en-US/docs/Web/CSS/length
 */
export const CSS_LENGTH_UNITS = [
  // Absolute lengths
  "px",
  "cm",
  "mm",
  "in",
  "pt",
  "pc",
  // Relative lengths
  "em",
  "rem",
  "ex",
  "ch",
  "lh",
  "rlh",
  // Viewport-relative
  "vw",
  "vh",
  "vmin",
  "vmax",
  "vi",
  "vb",
  "svw",
  "svh",
  "lvw",
  "lvh",
  "dvw",
  "dvh",
];

/**
 * CSS <length> - number with length units or unitless 0
 * Unitless 0 is valid in CSS for length values.
 */
export const length = or(
  number({ min: 0, max: 0 }), // Unitless 0 is valid
  numberWithUnit({ allowedUnits: CSS_LENGTH_UNITS, requireUnit: true }),
);

/**
 * CSS <length> - non-negative values only
 */
export const lengthNonNegative = or(
  number({ min: 0, max: 0 }),
  numberWithUnit({ min: 0, allowedUnits: CSS_LENGTH_UNITS, requireUnit: true }),
);

export const lengthValidator = createValidator(length);
export const lengthNonNegativeValidator = createValidator(lengthNonNegative);
