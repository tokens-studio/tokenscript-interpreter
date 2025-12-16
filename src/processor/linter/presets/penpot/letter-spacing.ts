import { or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { number } from "../validators/primitives";
import { numberWithUnit } from "../validators/unit";

/**
 * Penpot letter-spacing: number or number with unit (no percentage)
 *
 * CSS spec already disallows %, but Penpot additionally:
 * - Allows plain numbers (not just "normal" keyword)
 * - Does not support the "normal" keyword (resolves to actual value)
 */
export const letterSpacing = or(number(), numberWithUnit({ disallowedUnits: ["%"] }));

export const letterSpacingValidator = createValidator(letterSpacing);
