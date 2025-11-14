import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "../interpreter/interpreter";
import { isObject } from "../interpreter/utils/type";
import { buildTokens } from "./builders/base";
import type { OutputFormat, TokenBuilder } from "./builders/types";
import type { ProcessorOutput } from "./resolver/TokenResolver";
import { extractSetNames, resolveThemes, selectTheme } from "./utils/theme-resolver";
import { flattenObject, isNested, recordToMap } from "./utils/tokens";

// Types -----------------------------------------------------------------------

export interface ProcessOptions {
  config?: Config;
  output?: OutputFormat;
  builder?: TokenBuilder<any>;
}

export interface ProcessSetsOptions extends ProcessOptions {
  activeSets?: string[];
  activeTheme?: string;
}

export interface ProcessResult<T = Map<string, string | InterpreterResult>>
  extends ProcessorOutput {
  output: T;
}

// Helpers ---------------------------------------------------------------------

function determineSets(
  jsonFiles: Record<string, unknown>,
  activeSets?: string[],
  activeTheme?: string,
): string[] {
  if (activeSets) return activeSets;

  if (activeTheme) {
    const resolved = resolveThemes(jsonFiles);
    if (!resolved) {
      throw new Error(`No themes found for theme "${activeTheme}"`);
    }

    const [, themes] = resolved;
    const theme = selectTheme(themes, activeTheme);

    if (!theme) {
      const available = themes.map((t) => t.name).join(", ");
      throw new Error(`Theme "${activeTheme}" not found. Available: ${available}`);
    }

    return extractSetNames(theme.selectedTokenSets);
  }

  // Default: if normalized to single entry, use it
  const keys = Object.keys(jsonFiles);
  if (keys.length === 1) {
    return keys;
  }

  // If normalized to multiple entries but no selection made, we can't proceed
  if (keys.length > 1) {
    throw new Error(`Multiple sets found (${keys.join(", ")}) - specify activeSets or activeTheme`);
  }

  throw new Error("No sets to process");
}

function flattenToTokens(sets: Record<string, unknown>, setNames: string[]): Map<string, string> {
  const tokens = new Map<string, string>();

  for (const setName of setNames) {
    const setData = sets[setName];

    if (!setData) {
      throw new Error(`Token set "${setName}" not found`);
    }

    if (!isObject(setData)) {
      throw new Error(`Token set "${setName}" is not an object`);
    }

    const setTokens = isNested(setData) ? flattenObject(setData, "", true) : recordToMap(setData);

    for (const [key, value] of setTokens) {
      tokens.set(key, value);
    }
  }

  return tokens;
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

  const tokenMap: Map<string, string> =
    tokens instanceof Map ? tokens : flattenToTokens({ tokens }, ["tokens"]);

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

  const tokens = flattenToTokens(normalizedFiles, setNames);

  return buildTokens(tokens, { builder, config, output }) as ProcessResult<T>;
}
