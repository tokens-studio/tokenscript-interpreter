import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import { collectJsonFiles } from "./utils/file-collector";
import { resolveThemes, selectTheme, extractSetNames } from "./utils/theme-resolver";
import { isSingleEntryObject, isObject } from "../interpreter/utils/type";
import { flattenObject, isNested, recordToMap } from "./adapters/utils";
import { TokenProcessor, type ProcessorOutput } from "./TokenProcessor";

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
function normalizeJsonFiles(jsonFiles: Record<string, unknown>): Record<string, unknown> {
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
    // Flatten: top-level keys (except $-prefixed) become separate sets
    const expanded: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      if (!key.startsWith("$")) {
        expanded[key] = value;
      }
    }
    return expanded;
  }

  // Single file without metadata - return as is
  return jsonFiles;
}

// Determine sets to pick ------------------------------------------------------

function determineSets(
  jsonFiles: Record<string, unknown>,
  normalizedFiles: Record<string, unknown>,
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
  const keys = Object.keys(normalizedFiles);
  if (keys.length === 1) {
    return keys;
  }

  // If normalized to multiple entries but no selection made, we can't proceed
  if (keys.length > 1) {
    throw new Error(
      `Multiple sets found (${keys.join(", ")}) - specify activeSets or activeTheme`,
    );
  }

  throw new Error("No sets to process");
}

// Step 4: Flatten sets to tokens ----------------------------------------------

function flattenToTokens(
  sets: Record<string, unknown>,
  setNames: string[],
): Map<string, string> {
  const tokens = new Map<string, string>();

  for (const setName of setNames) {
    const setData = sets[setName];

    if (!setData) {
      throw new Error(`Token set "${setName}" not found`);
    }

    if (!isObject(setData)) {
      throw new Error(`Token set "${setName}" is not an object`);
    }

    const setTokens = isNested(setData)
      ? flattenObject(setData, "", true)
      : recordToMap(setData);

    for (const [key, value] of setTokens) {
      tokens.set(key, value);
    }
  }

  return tokens;
}

// Step 5: Interpret tokens ---------------------------------------------------

function interpretTokens(tokens: Map<string, string>): ProcessorOutput {
  const processor = new TokenProcessor();
  return processor.build(tokens);
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
  const setNames = determineSets(jsonFiles, normalizedFiles, activeSets, activeTheme);

  // Step 4: Flatten to tokens
  const tokens = flattenToTokens(normalizedFiles, setNames);

  // Step 5: Interpret tokens
  return interpretTokens(tokens);
}
