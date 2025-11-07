import type { Config } from "@interpreter/config";
import type { interpreterResult } from "../interpreter/interpreter";
import { isTokenscriptSymbol } from "../interpreter/symbols";
import { isObject, isSingleEntryObject } from "../interpreter/utils/type";
import { type ProcessorOutput, TokenProcessor } from "./TokenProcessor";
import { extractSetNames, resolveThemes, selectTheme } from "./utils/theme-resolver";
import { flattenObject, isNested, recordToMap } from "./utils/tokens";

export function collectErrors(
  result: ProcessorOutput,
): Record<string, { message: string; originalValue: string }> {
  const errors: Record<string, { message: string; originalValue: string }> = {};
  for (const [tokenName, error] of result.errors) {
    const originalValue = result.tokens.get(tokenName);
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

/**
 * Builds tokens with optional stringification for JSON output.
 */
function buildTokens(
  tokens: Map<string, string>,
  config?: Config,
  outputFormat: "string" | "symbols" = "string",
): ProcessorOutput & { tokens: Map<string, string | interpreterResult> } {
  const processor = new TokenProcessor();
  const output: Map<string, string | interpreterResult> = new Map();
  const errors: Map<string, Error> = new Map();

  const callbacks = {
    onResolve: (tokenName: string, value: interpreterResult) => {
      if (outputFormat === "symbols") {
        output.set(tokenName, value);
      } else {
        if (typeof value === "string") {
          output.set(tokenName, value);
        } else if (isTokenscriptSymbol(value)) {
          output.set(tokenName, value.toString());
        } else {
          output.set(tokenName, String(value));
        }
      }
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      output.set(tokenName, originalValue);
      errors.set(tokenName, error);
    },
  };

  const result = processor.processTokens(tokens, callbacks, config);

  return {
    ...result,
    tokens: output,
    errors,
  };
}

// Core Processing (Node + Browser) ------------------------------------------

/**
 * Process flat tokens directly without token sets or themes.
 * Accepts Map (preferred), flat Record<string, string>, or nested token JSON.
 * This is the simplest way to process tokens in-memory.
 *
 * @param tokens - Token map, flat record, or nested token JSON
 * @param options - Processing options
 * @param options.config - Custom interpreter config
 * @param options.output - Output format: "string" (default, JSON-safe) or "symbols" (preserves Symbol objects)
 * @returns ProcessorOutput with resolved tokens
 *
 * @example
 * // Flat tokens
 * processTokens({ base: "16", large: "{base} * 2" })
 *
 * // Nested tokens JSON
 * processTokens({ color: { primary: { $value: "#FF0000" } } })
 *
 * // Map
 * processTokens(new Map([["base", "16"], ["large", "{base} * 2"]]))
 */
export function processTokens(
  tokens: Map<string, string> | Record<string, any>,
  options: {
    config?: Config;
    output?: "string" | "symbols";
  } = {},
): ProcessorOutput & { tokens: Map<string, string | interpreterResult> } {
  const { config, output = "string" } = options;

  const tokenMap: Map<string, string> =
    tokens instanceof Map ? tokens : flattenToTokens({ tokens }, ["tokens"]);

  return buildTokens(tokenMap, config, output);
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
 * @returns ProcessorOutput with resolved tokens
 */
export function processTokenSets(
  normalizedFiles: Record<string, unknown>,
  options: {
    activeSets?: string[];
    activeTheme?: string;
    config?: Config;
    output?: "string" | "symbols";
  } = {},
): ProcessorOutput & { tokens: Map<string, string | interpreterResult> } {
  const { activeSets, activeTheme, config, output = "string" } = options;

  // Step 1: Determine sets to pick
  const setNames = determineSets(normalizedFiles, activeSets, activeTheme);

  // Step 2: Flatten to tokens
  const tokens = flattenToTokens(normalizedFiles, setNames);

  // Step 3: Interpret tokens
  return buildTokens(tokens, config, output);
}
