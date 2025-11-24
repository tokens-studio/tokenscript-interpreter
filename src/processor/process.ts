import type { InterpreterResult } from "../interpreter/interpreter";
import { buildTokens } from "./builders/base";
import type { ProcessOptions, ProcessResult, ProcessSetsOptions } from "./types";
import { determineSets, flattenToTokens } from "./utils/set-processor";
import type { TokenData } from "./utils/tokens";

// Main ------------------------------------------------------------------------

/**
 * Process flat token collection.
 */
export function processTokens<T = Map<string, string | InterpreterResult>>(
  tokens: Map<string, TokenData> | Map<string, string> | Record<string, any>,
  options: ProcessOptions = {},
): ProcessResult<T> {
  const { config, output = "string", builder, objectParsers, linter } = options;

  const tokenMap: Map<string, string | TokenData> =
    tokens instanceof Map ? tokens : flattenToTokens({ tokens }, ["tokens"]);

  return buildTokens(tokenMap, {
    builder,
    config,
    objectParsers,
    output,
    linter,
  }) as ProcessResult<T>;
}

/**
 * Process token sets with theme or set selection.
 */
export function processTokenSets<T = Map<string, string | InterpreterResult>>(
  normalizedFiles: Record<string, unknown>,
  options: ProcessSetsOptions = {},
): ProcessResult<T> {
  const {
    activeSets,
    activeTheme,
    config,
    output = "string",
    builder,
    objectParsers,
    linter,
  } = options;

  const setNames = determineSets(normalizedFiles, activeSets, activeTheme);

  const tokens = flattenToTokens(normalizedFiles, setNames);

  return buildTokens(tokens, {
    builder,
    config,
    objectParsers,
    output,
    linter,
  }) as ProcessResult<T>;
}
