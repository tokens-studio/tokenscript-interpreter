/**
 * Token Adapters Module
 *
 * Provides adapters to convert various input formats to the flat token map
 * format expected by TokenProcessor.
 */

export { JsonTokensAdapter } from "./JsonTokensAdapter";
export type { ThemeAdapterOptions } from "./ThemeTokensAdapter";
export { ThemeTokensAdapter } from "./ThemeTokensAdapter";
export type { AdapterOptions, TokenAdapter } from "./types";
export { flattenObject, isNested as hasNestedStructure, recordToMap } from "./utils";
