import { ProcessorError, ProcessorErrorCode } from "../../interpreter/errors";
import { isObject } from "../../interpreter/utils/type";
import { extractSetNames, resolveThemes, selectTheme } from "./theme-resolver";
import type { TokenData } from "./tokens";
import { flattenTokensObject, isNested, normalizeToTokenData, recordToMap } from "./tokens";

export function determineSets(
  jsonFiles: Record<string, unknown>,
  activeSets?: string[],
  activeTheme?: string,
): string[] {
  if (activeSets) return activeSets;

  if (activeTheme) {
    const resolved = resolveThemes(jsonFiles);
    if (!resolved) {
      throw new ProcessorError(ProcessorErrorCode.NO_THEMES_FOUND, {
        data: { themeName: activeTheme },
      });
    }

    const [, themes] = resolved;
    const theme = selectTheme(themes, activeTheme);

    if (!theme) {
      throw new ProcessorError(ProcessorErrorCode.THEME_NOT_FOUND, {
        data: {
          themeName: activeTheme,
          availableThemes: themes.map((t) => t.name),
        },
      });
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
    throw new ProcessorError(ProcessorErrorCode.MULTIPLE_SETS_NO_SELECTION, {
      data: { setNames: keys },
    });
  }

  throw new ProcessorError(ProcessorErrorCode.NO_SETS_TO_PROCESS);
}

/**
 * Converts setData to a Map of TokenData.
 * Handles Map, nested objects, and flat records.
 */
function getSetTokens(setData: unknown): Map<string, TokenData> {
  if (setData instanceof Map) {
    return setData;
  }

  if (!isObject(setData)) {
    return new Map<string, TokenData>();
  }

  if (isNested(setData)) {
    return flattenTokensObject(setData, "");
  }

  return recordToMap(setData);
}

/**
 * Flattens token sets or Map inputs to a normalized TokenDataMap.
 * Handles normalization of string values to TokenData format.
 *
 * @param sets - Record of token sets or a Map of tokens
 * @param setNames - Names of sets to process (ignored if sets is a Map)
 * @returns Normalized Map<string, TokenData>
 */
export function flattenToTokens(
  sets: Record<string, unknown> | Map<string, unknown>,
  setNames: string[],
): Map<string, TokenData> {
  const tokens = new Map<string, TokenData>();

  // For Map input, iterate directly; for Record, iterate through setNames
  const entries =
    sets instanceof Map ? sets.entries() : setNames.map((name) => [name, sets[name]] as const);

  for (const [key, setData] of entries) {
    if (sets instanceof Map) {
      // Direct Map entry - key is token name, setData is the value
      tokens.set(key, normalizeToTokenData(setData));
    } else {
      // Record entry - key is setName, setData is the set content
      // Check if set exists (only needed for Record lookups)
      if (!setData) {
        throw new ProcessorError(ProcessorErrorCode.TOKEN_SET_NOT_FOUND, {
          data: { setName: key },
        });
      }

      if (!isObject(setData) && !(setData instanceof Map)) {
        throw new ProcessorError(ProcessorErrorCode.TOKEN_SET_INVALID, {
          data: { setName: key },
        });
      }

      const setTokens = getSetTokens(setData);

      for (const [tokenKey, value] of setTokens) {
        tokens.set(tokenKey, normalizeToTokenData(value));
      }
    }
  }

  return tokens;
}
