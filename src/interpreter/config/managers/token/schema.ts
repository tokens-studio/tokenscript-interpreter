// Token-kind schema shim.
//
// Re-exports the typed shapes from @tokens-studio/schema-validation so that
// the rest of the interpreter can continue importing from
// "@interpreter/config/managers/token/schema". The schema-validation
// package is the cross-language source of truth for the schema language
// (TS / Go / Ruby).
//
// Aliases preserve the historical interpreter names (`SpecProperty`,
// `SpecItemsType`, `TokenSpecificationSchema`) so consumer code does not
// have to change.

import { Token, type z } from "@tokens-studio/schema-validation";

// Types -----------------------------------------------------------------------

export type TokenSpecification = Token.TokenSpecification;

/**
 * A property of a token's structural schema. Historical alias for the
 * recursive `Property` type from the schema-validation library; the
 * `z.infer` form is needed because tsup's DTS bundling drops the
 * type side of the value+type merged export through `* as Token`.
 */
export type SpecProperty = z.infer<typeof Token.Property>;

/**
 * The shape of items inside a list-typed property/schema. Historical
 * alias for the `ItemsSpec` type from the schema-validation library;
 * see {@link SpecProperty} for why `z.infer` is needed.
 */
export type SpecItemsType = z.infer<typeof Token.ItemsSpec>;

// Validation API --------------------------------------------------------------
//
// Explicit type annotations on these re-exports are required because
// tsup's DTS bundling (rollup-plugin-dts) can't construct a public path
// for the internal `Property` / `ItemsSpec` / zod types that transitively
// appear in the inferred return types of `Token.parseTokenSpec` etc.
// Without the annotation the DTS emit fails with TS4023 / TS2742.

/**
 * Validate and parse a JSON value as a token specification. Throws a
 * `ZodError` with a structured field-by-field error report on failure.
 *
 * Strictness:
 *   - Top level: unknown fields are tolerated (silently stripped).
 *   - Nested shapes (Schema, Property, ItemsSpec, ScriptBlock):
 *     unknown fields and unsupported enum values fail.
 */
export const parseTokenSpec: (json: unknown) => TokenSpecification = Token.parseTokenSpec;

/**
 * Like `parseTokenSpec` but returns a `{ success, data | error }`
 * discriminated union instead of throwing.
 */
export const safeParseTokenSpec: (
	json: unknown,
) => z.ZodSafeParseResult<TokenSpecification> = Token.safeParseTokenSpec;

/**
 * Historical compatibility alias for `parseTokenSpec`. Wrap a call in a
 * `try { ... } catch (err) { ... }` to handle validation failures.
 *
 * @deprecated Prefer `parseTokenSpec` / `safeParseTokenSpec`.
 */
export const TokenSpecificationSchema: (json: unknown) => TokenSpecification =
	Token.parseTokenSpec;

// Constants -------------------------------------------------------------------

/**
 * The set of valid `type` values for a token schema.
 *
 * Mirrored as a plain array for use in error messages and for backwards
 * compatibility with the previous arktype declaration. Hand-spelled
 * (rather than reading `.options` off the zod enum) because tsup's DTS
 * bundling drops the value side of namespaced re-exports — see
 * {@link SpecProperty} for the same workaround.
 */
export const validSchemaTypes = ["number", "string", "token", "object", "list"] as const;

// Helpers ---------------------------------------------------------------------

/** Lowercased lookup name for a token spec. */
export const specName: (spec: TokenSpecification) => string = Token.specName;
