import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import { isObject, isSingleEntryObject } from "../interpreter/utils/type";
import { type ProcessorOutput, TokenProcessor } from "./TokenProcessor";
import { collectJsonFiles } from "./utils/file-collector";
import { extractSetNames, resolveThemes, selectTheme } from "./utils/theme-resolver";
import { flattenObject, isNested, recordToMap } from "./utils/tokens";
import { interpreterResult } from "../interpreter/interpreter";
import { isTokenscriptSymbol } from "../interpreter/symbols";

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

export type ProcessTokensOptions = {
  path: string;
  outputPath?: string;
  schemas?: string[];
  activeSets?: string[];
  activeTheme?: string;
};

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

function buildTokens(tokens: Map<string, string>): ProcessorOutput {
  const processor = new TokenProcessor();
  const output: Map<string, string> = new Map();
  const errors: Map<string, Error> = new Map();

  const callbacks = {
    onResolve: (tokenName: string, value: interpreterResult) => {
      if (typeof value === "string") {
        output.set(tokenName, value);
      } else if (isTokenscriptSymbol(value)) {
        output.set(tokenName, value.toString());
      } else {
        output.set(tokenName, String(value));
      }
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      output.set(tokenName, originalValue);
      errors.set(tokenName, error);
    },
  };

  const result = processor.processTokens(tokens, callbacks);

  return {
    ...result,
    tokens: output,
    errors,
  };
}

// Main ------------------------------------------------------------------------

export async function processTokens({
  path: inputPath,
  schemas,
  activeSets,
  activeTheme,
}: ProcessTokensOptions): Promise<ProcessorOutput> {
  // Step 0: Register schemas
  await fetchAndRegisterSchemas(schemas ?? []);

  // Step 1: Collect JsonFiles
  const jsonFiles = await collectJsonFiles(inputPath);

  // Step 2: Normalize to flat structure
  const normalizedFiles = normalizeJsonFiles(jsonFiles);

  // Step 3: Determine sets to pick
  const setNames = determineSets(normalizedFiles, activeSets, activeTheme);

  // Step 4: Flatten to tokens
  const tokens = flattenToTokens(normalizedFiles, setNames);

  // Step 5: Interpret tokens
  return buildTokens(tokens);
}
