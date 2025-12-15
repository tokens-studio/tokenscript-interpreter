import { list, or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { string } from "../validators/primitives";

/**
 * CSS font-family: string or list of strings (font stack)
 * https://developer.mozilla.org/en-US/docs/Web/CSS/font-family
 *
 * Can be:
 * - A single font name: "Arial"
 * - A font stack (list): ["Helvetica", "Arial", "sans-serif"]
 */
export const fontFamily = or(string(), list(string(), { minCount: 1 }));

export const fontFamilyValidator = createValidator(fontFamily);
