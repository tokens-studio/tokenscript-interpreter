import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "../interpreter/interpreter";
import { isObject, isSingleEntryObject } from "../interpreter/utils/type";
import { MapBuilder, type TokenBuilder } from "./builders";
import { type ProcessorOutput, TokenResolver } from "./resolver/TokenResolver";
import { extractSetNames, resolveThemes, selectTheme } from "./utils/theme-resolver";
import { flattenObject, isNested, recordToMap } from "./utils/tokens";

export function collectErrors(result: {
  errors: Map<string, Error>;
  resolved: Map<string, any>;
}): Record<string, { message: string; originalValue: string }> {
  const errors: Record<string, { message: string; originalValue: string }> = {};
  for (const [tokenName, error] of result.errors) {
    const originalValue = result.resolved.get(tokenName);
    errors[tokenName] = {
      message: error.message,
      originalValue: String(originalValue),
    };
  }
  return errors;
}

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

/**
 * Builds tokens using a builder to accumulate results.
 */
function buildTokens<T>(
  tokens: Map<string, string>,
  builder: TokenBuilder<T>,
  config?: Config,
): ProcessorOutput & { tokens: Map<string, string | InterpreterResult>; output: T } {
  const processor = new TokenResolver();
  const errors: Map<string, Error> = new Map();

  const callbacks = {
    onResolve: (tokenName: string, value: InterpreterResult) => {
      builder.onResolve(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      builder.onError(tokenName, error, originalValue);
      errors.set(tokenName, error);
    },
  };

  const result = processor.processTokens(tokens, callbacks, config);

  // For backward compatibility, tokens property points to builder result if it's a Map,
  // otherwise use the builder's output
  const tokensOutput =
    builder.getResult() instanceof Map
      ? (builder.getResult() as Map<string, string | InterpreterResult>)
      : (builder.getResult() as any);

  return {
    ...result,
    tokens: tokensOutput,
    output: builder.getResult(),
    errors,
  };
}

// Core Processing (Node + Browser) ------------------------------------------

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
 * Accepts Map (preferred), flat Record<string, string>, or nested token JSON.
 * This is the simplest way to process tokens in-memory.
 *
 * @param tokens - Token map, flat record, or nested token JSON
 * @param options - Processing options
 * @param options.config - Custom interpreter config
 * @param options.output - Output format: "string" (default, JSON-safe) or "symbols" (preserves Symbol objects)
 * @param options.builder - Custom builder for constructing output structure (overrides output format)
 * @returns ProcessorOutput with resolved tokens and output structure
 *
 * @example
 * // Default map builder
 * const result = processTokens({ base: "16", large: "{base} * 2" })
 * console.log(result.tokens) // Map { "base" => "16", "large" => "32" }
 *
 * // Nested JSON builder
 * import { NestedJsonBuilder } from './builders'
 * const result = processTokens({ "color.primary": "#FF0000" }, {
 *   builder: new NestedJsonBuilder()
 * })
 * console.log(result.output) // { color: { primary: "#FF0000" } }
 *
 * // Map
 * processTokens(new Map([["base", "16"], ["large", "{base} * 2"]]))
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
 * Does NOT handle schema registration - use processTokensFromFiles for that.
 *
 * @param normalizedFiles - Token sets to process
 * @param options - Processing options
 * @param options.activeSets - Token sets to include
 * @param options.activeTheme - Theme to activate
 * @param options.config - Custom interpreter config
 * @param options.output - Output format: "string" (default, JSON-safe) or "symbols" (preserves Symbol objects)
 * @param options.builder - Custom builder for constructing output structure (overrides output format)
 * @returns ProcessorOutput with resolved tokens and output structure
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
