// Color-kind schema shim.
//
// Re-exports the typed shapes from @tokens-studio/schema-validation so
// that the rest of the interpreter can continue importing from
// "@interpreter/config/managers/color/schema". The schema-validation
// package is the cross-language source of truth for the schema language
// (TS / Go / Ruby).
//
// Aliases preserve the historical interpreter names (`SpecProperty`,
// `ColorSpecificationSchema`, `validSchemaTypes`,
// `MINIMAL_COLOR_SPECIFICATION`) so consumer code does not have to
// change.

import { Color } from "@tokens-studio/schema-validation";

// Types -----------------------------------------------------------------------

export type ColorSpecification = Color.ColorSpecification;

/**
 * A property of a color schema (typically a channel like r/g/b/a).
 * Historical alias for the `ColorProperty` type from the
 * schema-validation library.
 */
export type SpecProperty = Color.ColorProperty;

// Validation API --------------------------------------------------------------

/**
 * Validate and parse a JSON value as a color specification. Throws a
 * `ZodError` with a structured field-by-field error report on failure.
 *
 * Strictness:
 *   - Top level: unknown fields are tolerated (silently stripped).
 *   - Nested shapes (ColorSchema, ColorProperty, Initializer, Conversion,
 *     ColorScriptBlock): unknown fields and unsupported enum values fail.
 */
export const parseColorSpec = Color.parseColorSpec;

/**
 * Like `parseColorSpec` but returns a `{ success, data | error }`
 * discriminated union instead of throwing.
 */
export const safeParseColorSpec = Color.safeParseColorSpec;

/**
 * Historical compatibility alias for `parseColorSpec`. Wrap a call in a
 * `try { ... } catch (err) { ... }` to handle validation failures.
 *
 * @deprecated Prefer `parseColorSpec` / `safeParseColorSpec`.
 */
export const ColorSpecificationSchema = Color.parseColorSpec;

// Constants -------------------------------------------------------------------

/**
 * The set of valid `type` values for a color schema property.
 *
 * Hand-spelled (rather than reading `.options` off the zod enum)
 * because tsup's DTS bundling drops the value side of namespaced
 * re-exports.
 */
export const validSchemaTypes = ["number", "string", "color"] as const;

// Helpers ---------------------------------------------------------------------

/** Lowercased lookup name for a color spec. */
export const specName = Color.specName;

// Defaults --------------------------------------------------------------------

/**
 * Minimal viable ColorSpecification for testing and defaults.
 *
 * Always passes `parseColorSpec` — see the schema-minimal regression
 * test in tests/interpreter/color/schema-minimal.test.ts.
 */
export const MINIMAL_COLOR_SPECIFICATION: ColorSpecification = {
  name: "MinimalColor",
  type: "color" as const,
  schema: {
    type: "object",
    properties: {
      value: {
        type: "string",
      },
    },
  },
  initializers: [
    {
      keyword: "minimal",
      script: {
        type: "https://schema.example.com/tokenscript/0/",
        script: "return {input};",
      },
    },
  ],
  conversions: [],
};
