import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "../interpreter/interpreter";
import { isObject, isSingleEntryObject } from "../interpreter/utils/type";
import { MapBuilder, type TokenBuilder } from "./builders";
import { buildTokens } from "./builders/base";
import type { ProcessorOutput } from "./resolver/TokenResolver";
import { extractSetNames, resolveThemes, selectTheme } from "./utils/theme-resolver";
import { flattenObject, isNested, recordToMap } from "./utils/tokens";

// Json Normalization ----------------------------------------------------------

/**
 * If single file has $-prefixed keys (themes/metadata), expand top-level keys to separate sets.
 * Otherwise return as-is.
 */
export function normalizeJsonFiles(jsonFiles: Record<string, unknown>): Record<string, unknown> {
  if (!isSingleEntryObject(jsonFiles)) {
    return jsonFiles; // Already multi-file
  }

  const [, content] = Object.entries(jsonFiles)[0];

  if (!isObject(content)) {
    throw new Error("File content is not an object");
  }

  // Check if single file has metadata keys (like $themes, $metadata)
  const hasMetadata = Object.keys(content).some((key) => key.startsWith("$"));
  if (hasMetadata) {
    return content;
  }

  return jsonFiles;
}

// Determine sets to pick ------------------------------------------------------

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

// Step 4: Flatten sets to tokens ----------------------------------------------

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

// Step 5: Interpret tokens ---------------------------------------------------

export type OutputFormat = "string" | "symbols";

export interface ProcessOptions {
  config?: Config;
  output?: OutputFormat;
  builder?: TokenBuilder<any>;
}

export interface ProcessResult<T = Map<string, string | InterpreterResult>>
  extends ProcessorOutput {
  tokens: Map<string, string | InterpreterResult>;
  output: T;
}

/**
 * Process flat tokens directly without token sets or themes.
 */
export function processTokens<T = Map<string, string | InterpreterResult>>(
  tokens: Map<string, string> | Record<string, any>,
  options: ProcessOptions = {},
): ProcessResult<T> {
  const { config, output = "string", builder } = options;

  const tokenMap: Map<string, string> =
    tokens instanceof Map ? tokens : flattenToTokens({ tokens }, ["tokens"]);

  const tokenBuilder = builder ?? new MapBuilder(output);

  return buildTokens(tokenMap, tokenBuilder, config) as ProcessResult<T>;
}

export interface ProcessSetsOptions extends ProcessOptions {
  activeSets?: string[];
  activeTheme?: string;
}

/**
 * Process token sets with themes and activeSets support.
 * Handles complex token JSON structures with $themes, multiple sets, etc.
 */
export function processTokenSets<T = Map<string, string | InterpreterResult>>(
  normalizedFiles: Record<string, unknown>,
  options: ProcessSetsOptions = {},
): ProcessResult<T> {
  const { activeSets, activeTheme, config, output = "string", builder } = options;

  // Step 1: Determine sets to pick
  const setNames = determineSets(normalizedFiles, activeSets, activeTheme);

  // Step 2: Flatten to tokens
  const tokens = flattenToTokens(normalizedFiles, setNames);

  // Step 3: Build tokens using builder
  const tokenBuilder = builder ?? new MapBuilder(output);

  return buildTokens(tokens, tokenBuilder, config) as ProcessResult<T>;
}
