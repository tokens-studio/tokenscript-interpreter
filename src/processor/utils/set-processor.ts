import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
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

export function flattenToTokens(
  sets: Record<string, unknown>,
  setNames: string[],
): Map<string, TokenData> {
  const tokens = new Map<string, TokenData>();

  for (const setName of setNames) {
    const setData = sets[setName];

    if (!setData) {
      throw new ProcessorError(ProcessorErrorCode.TOKEN_SET_NOT_FOUND, {
        data: { setName },
      });
    }

    if (!isObject(setData)) {
      throw new ProcessorError(ProcessorErrorCode.TOKEN_SET_INVALID, {
        data: { setName },
      });
    }

    const setTokens = isNested(setData) ? flattenTokensObject(setData, "") : recordToMap(setData);

    for (const [key, value] of setTokens) {
      tokens.set(key, value);
    }
  }

  return tokens;
}
