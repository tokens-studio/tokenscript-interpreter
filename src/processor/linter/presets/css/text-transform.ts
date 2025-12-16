import { createValidator } from "../validators/create";
import { string } from "../validators/primitives";

/**
 * CSS text-transform values
 */
export const CSS_TEXT_TRANSFORM_VALUES = [
  "none",
  "capitalize",
  "uppercase",
  "lowercase",
  "full-width",
  "full-size-kana",
];

/**
 * CSS text-transform
 * https://developer.mozilla.org/en-US/docs/Web/CSS/text-transform
 */
export const textTransform = string({ allowedValues: CSS_TEXT_TRANSFORM_VALUES });

export const textTransformValidator = createValidator(textTransform);
