import { createValidator } from "../validators/create";
import { string } from "../validators/primitives";

/**
 * CSS text-decoration-line values
 */
export const CSS_TEXT_DECORATION_LINE_VALUES = [
  "none",
  "underline",
  "overline",
  "line-through",
  "blink",
];

/**
 * CSS text-decoration-line
 * https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-line
 *
 * Note: This validates a single value. CSS allows multiple values
 * like "underline overline", but design tokens typically use single values.
 */
export const textDecorationLine = string({ allowedValues: CSS_TEXT_DECORATION_LINE_VALUES });

export const textDecorationLineValidator = createValidator(textDecorationLine);
