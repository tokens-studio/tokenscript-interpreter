import { isString } from "../interpreter/utils/type";
import type { InterpreterResult } from "../interpreter/interpreter";
import { buildTokens } from "./builders/base";
import type { ProcessOptions, ProcessResult, ProcessSetsOptions } from "./types";
import { determineSets, flattenToTokens } from "./utils/set-processor";
import type { TokenData } from "./utils/tokens";

// Helpers ---------------------------------------------------------------------

/**
 * Converts TokenData values to strings for processing.
 * Primitive values are converted directly, structured values are kept as-is for now.
 */
function tokenDataToString(data: TokenData): string {
  if (isString(data.$value)) {
    return data.$value;
  }
  // For now, convert non-string primitives to strings
  // Structured values will be handled in Phase 3
  return String(data.$value);
}

// Main ------------------------------------------------------------------------

/**
 * Process flat token collection.
 */
export function processTokens<T = Map<string, string | InterpreterResult>>(
  tokens: Map<string, string> | Record<string, any>,
  options: ProcessOptions = {},
): ProcessResult<T> {
  const { config, output = "string", builder } = options;

  let tokenMap: Map<string, string>;

  if (tokens instanceof Map) {
    // Assume it's already string values for backward compatibility
    tokenMap = tokens as Map<string, string>;
  } else {
    const tokenDataMap = flattenToTokens({ tokens }, ["tokens"]);
    tokenMap = new Map<string, string>();
    for (const [key, data] of tokenDataMap) {
      tokenMap.set(key, tokenDataToString(data));
    }
  }

  return buildTokens(tokenMap, { builder, config, output }) as ProcessResult<T>;
}

/**
 * Process token sets with theme or set selection.
 */
export function processTokenSets<T = Map<string, string | InterpreterResult>>(
  normalizedFiles: Record<string, unknown>,
  options: ProcessSetsOptions = {},
): ProcessResult<T> {
  const { activeSets, activeTheme, config, output = "string", builder } = options;

  const setNames = determineSets(normalizedFiles, activeSets, activeTheme);

  const tokenDataMap = flattenToTokens(normalizedFiles, setNames);

  // Convert TokenData to strings for processing
  const tokens = new Map<string, string>();
  for (const [key, data] of tokenDataMap) {
    tokens.set(key, tokenDataToString(data));
  }

  return buildTokens(tokens, { builder, config, output }) as ProcessResult<T>;
}
