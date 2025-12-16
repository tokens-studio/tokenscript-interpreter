import { CSS_LENGTH_UNITS } from "../css/utils/length";
import { or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { number } from "../validators/primitives";
import { numberWithUnit } from "../validators/unit";

/**
 * Penpot stroke-width: non-negative number or dimension
 *
 * Differs from CSS:
 * - Must be non-negative (>= 0)
 * - No percentage allowed (uses CSS length units only)
 * - Plain numbers are allowed (interpreted as px)
 */
export const strokeWidth = or(
  number({ min: 0 }),
  numberWithUnit({ min: 0, allowedUnits: CSS_LENGTH_UNITS }),
);

export const strokeWidthValidator = createValidator(strokeWidth);
