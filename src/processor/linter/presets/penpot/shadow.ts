import { list, or, struct } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { boolean, color, number } from "../validators/primitives";
import { numberWithUnit } from "../validators/unit";

/**
 * Penpot shadow offset: any number or dimension
 * Can be positive or negative.
 */
const shadowOffset = or(number(), numberWithUnit());

/**
 * Penpot shadow blur: non-negative number or dimension
 *
 * Differs from CSS box-shadow spec where negative blur is treated as 0.
 * Penpot validates that blur must be >= 0.
 */
const shadowBlur = or(number({ min: 0 }), numberWithUnit({ min: 0 }));

/**
 * Penpot shadow spread: non-negative number or dimension
 *
 * Differs from CSS box-shadow spec which allows negative spread.
 * Penpot validates that spread must be >= 0.
 */
const shadowSpread = or(number({ min: 0 }), numberWithUnit({ min: 0 }));

/**
 * Single Penpot shadow definition
 *
 * Fields:
 * - offsetX: horizontal offset (can be negative)
 * - offsetY: vertical offset (can be negative)
 * - blur: blur radius (must be >= 0)
 * - spread: spread radius (must be >= 0)
 * - color: shadow color
 * - inset: whether shadow is inset (inner shadow)
 */
export const shadowSingle = struct({
  offsetX: shadowOffset,
  offsetY: shadowOffset,
  blur: shadowBlur,
  spread: shadowSpread,
  color: color(),
  inset: boolean(),
});

/**
 * Penpot shadow token: array of one or more shadows
 */
export const shadow = list(shadowSingle, { minCount: 1 });

export const shadowValidator = createValidator(shadow);
export const shadowSingleValidator = createValidator(shadowSingle);
