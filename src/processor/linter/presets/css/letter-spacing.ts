import { or } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { string } from "../validators/primitives";
import { length } from "./length";

/**
 * CSS letter-spacing: normal | <length>
 * https://developer.mozilla.org/en-US/docs/Web/CSS/letter-spacing
 *
 * Note: CSS spec does NOT allow percentage for letter-spacing.
 * Only "normal" keyword or <length> values are valid.
 */
export const letterSpacing = or(string({ allowedValues: ["normal"] }), length);

export const letterSpacingValidator = createValidator(letterSpacing);
