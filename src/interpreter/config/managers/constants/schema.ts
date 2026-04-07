// Constants-kind schema shim.
//
// Re-exports the typed shapes from @tokens-studio/schema-validation so
// that the rest of the interpreter can continue importing from
// "@interpreter/config/managers/constants/schema". The schema-validation
// package is the cross-language source of truth for the schema language
// (TS / Go / Ruby).
//
// The historical alias `ConstantsSpecificationSchema` is preserved for
// public API compatibility but is currently not called from anywhere
// inside the interpreter (Constants are dispatched in
// `Config.registerSchemas` without separate validation).

import { Constants, type z } from "@tokens-studio/schema-validation";

// Types -----------------------------------------------------------------------

export type ConstantsSpecification = Constants.ConstantsSpecification;

// Validation API --------------------------------------------------------------
//
// Explicit type annotations on these re-exports are required because
// tsup's DTS bundling (rollup-plugin-dts) can't construct a public path
// for the internal types that transitively appear in the inferred
// return types of `Constants.parseConstantsSpec` etc. Without the
// annotation the DTS emit fails with TS4023 / TS2742.

/**
 * Validate and parse a JSON value as a constants specification. Throws
 * a `ZodError` with a structured field-by-field error report on failure.
 *
 * Strictness:
 *   - Top level: unknown fields are tolerated (silently stripped).
 *   - `values` entries: must be `string | number | boolean`. Object,
 *     array, and `null` values are rejected.
 */
export const parseConstantsSpec: (json: unknown) => ConstantsSpecification =
	Constants.parseConstantsSpec;

/**
 * Like `parseConstantsSpec` but returns a `{ success, data | error }`
 * discriminated union instead of throwing.
 */
export const safeParseConstantsSpec: (
	json: unknown,
) => z.ZodSafeParseResult<ConstantsSpecification> = Constants.safeParseConstantsSpec;

/**
 * Historical compatibility alias for `parseConstantsSpec`. Wrap a call
 * in a `try { ... } catch (err) { ... }` to handle validation failures.
 *
 * @deprecated Prefer `parseConstantsSpec` / `safeParseConstantsSpec`.
 */
export const ConstantsSpecificationSchema: (json: unknown) => ConstantsSpecification =
	Constants.parseConstantsSpec;

// Helpers ---------------------------------------------------------------------

/** Lowercased lookup name for a constants spec. */
export const specName: (spec: ConstantsSpecification) => string = Constants.specName;
