import { createValidator } from "../validators/create";
import { number } from "../validators/primitives";

/**
 * CSS opacity: <number> in range [0, 1]
 * https://developer.mozilla.org/en-US/docs/Web/CSS/opacity
 *
 * Note: CSS spec technically allows values outside 0-1, but they are clamped.
 * We validate for the clamped range as that's the practical valid range.
 */
export const opacity = number({ min: 0, max: 1 });

export const opacityValidator = createValidator(opacity);
