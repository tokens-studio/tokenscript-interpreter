import { list, struct } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { boolean, color } from "../validators/primitives";
import { length } from "./utils/length";

/**
 * Single CSS box-shadow value
 * https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
 *
 * Syntax: inset? <offset-x> <offset-y> <blur-radius>? <spread-radius>? <color>?
 *
 * Note: CSS allows negative blur (treated as 0) and negative spread.
 * We validate according to spec - negative values are allowed.
 */
export const boxShadowSingle = struct({
  offsetX: length,
  offsetY: length,
  blur: length, // CSS allows any length, negative treated as 0
  spread: length, // CSS allows negative spread
  color: color(),
  inset: boolean(),
});

/**
 * CSS box-shadow: <shadow>#
 * https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
 *
 * One or more shadow definitions.
 * Note: "none" keyword is not handled here - that would be at the token level.
 */
export const boxShadow = list(boxShadowSingle, { minCount: 1 });

export const boxShadowValidator = createValidator(boxShadow);
export const boxShadowSingleValidator = createValidator(boxShadowSingle);
