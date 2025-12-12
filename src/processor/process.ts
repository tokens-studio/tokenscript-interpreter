import type { InterpreterResult } from "../interpreter/interpreter";
import { buildTokens } from "./builders/base";
import type { ProcessOptions, ProcessResult, ProcessSetsOptions } from "./types";
import { determineSets, flattenToTokens } from "./utils/set-processor";
import type { TokenData } from "./utils/tokens";

// Main ------------------------------------------------------------------------

/**
 * Process flat token collection.
 *
 * @param tokens - Token input in various formats (Map or Record)
 * @param options - Processing options
 * @returns Processed tokens with resolved values
 *
 * @note Performance optimization: If you already have a `Map<string, TokenData>`,
 * you can skip this function and call `buildTokens` directly to avoid unnecessary flattening.
 */
export function processTokens<T = Map<string, string | InterpreterResult>>(
  tokens: Map<string, TokenData> | Map<string, string> | Record<string, any>,
  options?: ProcessOptions,
): ProcessResult<T> {
  const tokenDataMap =
    tokens instanceof Map ? flattenToTokens(tokens, []) : flattenToTokens({ tokens }, ["tokens"]);

  return buildTokens(tokenDataMap, options) as ProcessResult<T>;
}

/**
 * Process token sets with theme or set selection.
 */
export function processTokenSets<T = Map<string, string | InterpreterResult>>(
  normalizedFiles: Record<string, unknown>,
  options?: ProcessSetsOptions,
): ProcessResult<T> {
  const { activeSets, activeTheme } = options ?? {};

  const setNames = determineSets(normalizedFiles, activeSets, activeTheme);

  const tokens = flattenToTokens(normalizedFiles, setNames);

  return buildTokens(tokens, options) as ProcessResult<T>;
}
