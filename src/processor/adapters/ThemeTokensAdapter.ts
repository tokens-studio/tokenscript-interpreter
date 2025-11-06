import { isArray, isObject } from "@/src/interpreter/utils/type";
import type { AdapterOptions, TokenAdapter } from "./types";
import { flattenObject } from "./utils";

/**
 * Options for theme tokens adapter
 */
export interface ThemeAdapterOptions extends AdapterOptions {
  /** Name of the theme to extract (if not provided, will extract first theme) */
  themeName?: string;
}

interface TokenSetRefObject {
  id: string;
  status: "enabled" | "source";
}

type SelectedTokenSets = Record<string, "enabled" | "source"> | TokenSetRefObject[];

interface ThemeDefinition {
  name: string;
  selectedTokenSets: SelectedTokenSets;
}

/**
 * Adapter for processing tokens with theme definitions (Design Tokens format with $themes)
 *
 * Extracts tokens from selected token sets based on theme configuration.
 *
 * @example
 * const adapter = ThemeTokensAdapter({ themeName: 'dark' });
 * const tokens = adapter(tokensJsonWithThemes);
 * // => Map { "color.background" => "#000000", ... }
 */
export function ThemeTokensAdapter(
  options: ThemeAdapterOptions = {},
): TokenAdapter<Record<string, any>> {
  const { themeName, skipMetadata = true } = options;

  return (input: Record<string, any>): Map<string, string> => {
    if (!isObject(input)) {
      throw new Error("ThemeTokensAdapter: Expected an object");
    }

    if (!("$themes" in input) || !isArray(input.$themes)) {
      throw new Error("ThemeTokensAdapter: Expected $themes array in input");
    }

    const themes = input.$themes as ThemeDefinition[];

    // Find the theme
    let theme: ThemeDefinition | undefined;
    if (themeName) {
      theme = themes.find((t) => t.name === themeName);
      if (!theme) {
        throw new Error(`ThemeTokensAdapter: Theme '${themeName}' not found`);
      }
    } else {
      // Use first theme if no name specified
      theme = themes[0];
      if (!theme) {
        throw new Error("ThemeTokensAdapter: No themes found");
      }
    }

    // Extract tokens from selected token sets
    const tokens = new Map<string, string>();
    const selectedTokenSets = theme.selectedTokenSets;

    if (isArray(selectedTokenSets)) {
      // New format: array of objects with id and status
      for (const tokenSetRef of selectedTokenSets) {
        if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
          const setId = tokenSetRef.id;
          if (setId in input && isObject(input[setId])) {
            const flatTokens = flattenObject(input[setId] as Record<string, any>, "", skipMetadata);
            for (const [key, value] of flatTokens) {
              tokens.set(key, value);
            }
          }
        }
      }
    } else {
      // Old format: object with key-value pairs
      for (const [setName, status] of Object.entries(selectedTokenSets)) {
        if (status === "enabled" || status === "source") {
          if (setName in input && isObject(input[setName])) {
            const flatTokens = flattenObject(
              input[setName] as Record<string, any>,
              "",
              skipMetadata,
            );
            for (const [key, value] of flatTokens) {
              tokens.set(key, value);
            }
          }
        }
      }
    }

    return tokens;
  };
}
