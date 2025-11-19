import { isObject } from "../../interpreter/utils/type";
import { extractSetNames, resolveThemes, selectTheme } from "./theme-resolver";
import type { TokenData } from "./tokens";
import { flattenTokensObject, isNested, recordToMap } from "./tokens";

export function determineSets(
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

export function flattenToTokens(
  sets: Record<string, unknown>,
  setNames: string[],
): Map<string, TokenData> {
  const tokens = new Map<string, TokenData>();

  for (const setName of setNames) {
    const setData = sets[setName];

    if (!setData) {
      throw new Error(`Token set "${setName}" not found`);
    }

    if (!isObject(setData)) {
      throw new Error(`Token set "${setName}" is not an object`);
    }

    const setTokens = isNested(setData) ? flattenTokensObject(setData, "") : recordToMap(setData);

    for (const [key, value] of setTokens) {
      tokens.set(key, value);
    }
  }

  return tokens;
}
