// Unit-kind schema shim.
//
// Re-exports the typed shapes from @tokens-studio/schema-validation so
// that the rest of the interpreter can continue importing from
// "@interpreter/config/managers/unit/schema". The schema-validation
// package is the cross-language source of truth for the schema language
// (TS / Go / Ruby).
//
// Aliases preserve the historical interpreter names (`ScriptBlock`,
// `Conversion`, `UnitSpecificationSchema`, `validUnitTypes`) so consumer
// code does not have to change.

import { Unit } from "@tokens-studio/schema-validation";

// Types -----------------------------------------------------------------------

export type UnitSpecification = Unit.UnitSpecification;
export type Conversion = Unit.Conversion;
export type ScriptBlock = Unit.UnitScriptBlock;

// Validation API --------------------------------------------------------------

/**
 * Validate and parse a JSON value as a unit specification. Throws a
 * `ZodError` with a structured field-by-field error report on failure.
 *
 * Strictness:
 *   - Top level: unknown fields are tolerated (silently stripped).
 *   - Nested shapes (Conversion, UnitScriptBlock): unknown fields are
 *     rejected.
 *
 * Note: unit Conversions have NO `lossless` field — unit conversions
 * are mathematical and treated as information-preserving. This is a
 * deliberate cross-kind asymmetry with color Conversions.
 */
export const parseUnitSpec = Unit.parseUnitSpec;

/**
 * Like `parseUnitSpec` but returns a `{ success, data | error }`
 * discriminated union instead of throwing.
 */
export const safeParseUnitSpec = Unit.safeParseUnitSpec;

/**
 * Historical compatibility alias for `parseUnitSpec`. Wrap a call in a
 * `try { ... } catch (err) { ... }` to handle validation failures.
 *
 * @deprecated Prefer `parseUnitSpec` / `safeParseUnitSpec`.
 */
export const UnitSpecificationSchema = Unit.parseUnitSpec;

// Constants -------------------------------------------------------------------

/**
 * The set of valid `type` values for a unit specification.
 *
 * Hand-spelled because tsup's DTS bundling drops the value side of
 * namespaced re-exports — `Unit.UnitType` is reachable as a TYPE but
 * not as the underlying zod enum value.
 */
export const validUnitTypes = ["absolute", "relative"] as const;

// Helpers ---------------------------------------------------------------------

/** Lowercased lookup name for a unit spec. */
export const specName = Unit.specName;
