// Function-kind schema shim.
//
// Re-exports the typed shapes from @tokens-studio/schema-validation so
// that the rest of the interpreter can continue importing from
// "@interpreter/config/managers/functions/schema". The schema-validation
// package is the cross-language source of truth for the schema language
// (TS / Go / Ruby).
//
// The historical alias `FunctionSpecificationSchema` is preserved for
// consumer code that still uses the callable form.

import { Fn } from "@tokens-studio/schema-validation";

// Types -----------------------------------------------------------------------

export type FunctionSpecification = Fn.FunctionSpecification;

// Validation API --------------------------------------------------------------

/**
 * Validate and parse a JSON value as a function specification. Throws a
 * `ZodError` with a structured field-by-field error report on failure.
 *
 * Strictness:
 *   - Top level: unknown fields are tolerated (silently stripped).
 *   - Nested shapes (FunctionInput, FunctionScriptBlock): unknown
 *     fields are rejected.
 */
export const parseFunctionSpec = Fn.parseFunctionSpec;

/**
 * Like `parseFunctionSpec` but returns a `{ success, data | error }`
 * discriminated union instead of throwing.
 */
export const safeParseFunctionSpec = Fn.safeParseFunctionSpec;

/**
 * Historical compatibility alias for `parseFunctionSpec`. Wrap a call in
 * a `try { ... } catch (err) { ... }` to handle validation failures.
 *
 * @deprecated Prefer `parseFunctionSpec` / `safeParseFunctionSpec`.
 */
export const FunctionSpecificationSchema = Fn.parseFunctionSpec;

// Helpers ---------------------------------------------------------------------

/** Lowercased lookup name for a function spec. */
export const specName = Fn.specName;
