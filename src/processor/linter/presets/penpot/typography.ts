import { fontFamily, fontWeight } from "../css";
import { or, struct } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { number, string } from "../validators/primitives";
import { numberWithUnit } from "../validators/unit";
import { letterSpacing } from "./letter-spacing";

/**
 * Penpot text-case values (maps to CSS text-transform)
 *
 * Penpot uses a subset of CSS text-transform values.
 */
export const PENPOT_TEXT_CASE_VALUES = ["none", "uppercase", "lowercase", "capitalize"];

export const textCase = string({ allowedValues: PENPOT_TEXT_CASE_VALUES });

/**
 * Penpot text-decoration values
 *
 * Penpot uses a subset of CSS text-decoration-line values.
 */
export const PENPOT_TEXT_DECORATION_VALUES = ["none", "underline", "line-through", "overline"];

export const textDecoration = string({ allowedValues: PENPOT_TEXT_DECORATION_VALUES });

/**
 * Penpot font-size: non-negative number or dimension
 */
export const fontSize = or(number({ min: 0 }), numberWithUnit({ min: 0 }));

/**
 * Penpot line-height: non-negative number (multiplier)
 *
 * Penpot normalizes line-height to a unitless multiplier,
 * unlike CSS which supports various formats.
 */
export const lineHeight = number({ min: 0 });

/**
 * Penpot typography composite token
 *
 * All fields are optional. Validators match Penpot's expected value types.
 */
export const typography = struct({
  fontSize: fontSize,
  fontFamily: fontFamily,
  fontWeight: fontWeight,
  lineHeight: lineHeight,
  letterSpacing: letterSpacing,
  textCase: textCase,
  textDecoration: textDecoration,
});

export const typographyValidator = createValidator(typography);
