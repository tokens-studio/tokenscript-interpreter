import { type } from "arktype";
import { isObject } from "@/src/interpreter/utils/type";

// Note: disabled sets are not included
const SelectedTokenSetsSchema = type("Record<string, 'enabled' | 'source'>");

const ThemeSchema = type({
  name: "string",
  selectedTokenSets: SelectedTokenSetsSchema,
  "figmaCollectionId?": "string",
  "figmaModeId?": "string",
  "group?": "string",
});

// Schema for standalone themes array (like $themes.json)
const ThemesArraySchema = ThemeSchema.array();

export type ThemesArray = typeof ThemesArraySchema.infer;
export type Theme = typeof ThemeSchema.infer;
export type SelectedTokenSets = typeof SelectedTokenSetsSchema.infer;
export type SelectedTokenSetsObject = typeof SelectedTokenSetsObjectSchema.infer;
export type SelectedTokenSetsArray = typeof SelectedTokenSetsArraySchema.infer;

/**
 * Selects a theme by name from an array of themes.
 * 
 * @param themes - Array of themes to search through
 * @param themeName - Name of the theme to find
 * @returns The matching theme or undefined if not found
 * 
 * @example
 * const themes = [
 *   { name: "light", selectedTokenSets: { core: "enabled" } },
 *   { name: "dark", selectedTokenSets: { core: "enabled" } },
 * ];
 * const darkTheme = selectTheme(themes, "dark");
 * // => { name: "dark", selectedTokenSets: { core: "enabled" } }
 */
export const selectTheme = (
  themes: ThemesArray,
  themeName: string,
): Theme | undefined => {
  return themes.find((theme) => theme.name === themeName);
};

/**
 * Selects a theme by name, or returns the first theme if no name is provided.
 * 
 * @param themes - Array of themes to search through
 * @param themeName - Optional name of the theme to find
 * @returns The matching theme, first theme, or undefined if array is empty
 * 
 * @example
 * const themes = [
 *   { name: "light", selectedTokenSets: { core: "enabled" } },
 *   { name: "dark", selectedTokenSets: { core: "enabled" } },
 * ];
 * const theme = selectThemeOrFirst(themes, "dark");
 * // => { name: "dark", selectedTokenSets: { core: "enabled" } }
 * 
 * const defaultTheme = selectThemeOrFirst(themes);
 * // => { name: "light", selectedTokenSets: { core: "enabled" } }
 */
export const selectThemeOrFirst = (
  themes: ThemesArray,
  themeName?: string,
): Theme | undefined => {
  if (!themeName) {
    return themes[0];
  }
  
  const theme = selectTheme(themes, themeName);
  return theme ?? themes[0];
};

/**
 * Resolves themes from collected json using arktype validation.
 * 
 * Handles two formats:
 * 1. Single JSON with embedded $themes property (e.g., tokens.json with $themes: [...])
 * 2. Separate $themes jsons containing a direct array of themes
 * 
 * Uses arktype to validate the structure:
 * - Each theme must have a 'name' string property
 * - Each theme must have a 'selectedTokenSets' property (any type)
 * - Optional properties: figmaCollectionId, figmaModeId, group
 * 
 * @param json - Record of collected jsons from file-collector
 * @returns Tuple of [path, themes array] or undefined if no valid themes found
 */
export const resolveThemes = (
  json: Record<string, unknown>,
): [string, ThemesArray] | undefined => {
  const jsonFileKeys = Object.keys(json);

  // When there's a single JSON file, check if it has a $themes key
  if (jsonFileKeys.length === 1) {
    const firstFileContent = json[jsonFileKeys[0]];
    
    if (isObject(firstFileContent) && "$themes" in firstFileContent) {
      const themesValue = firstFileContent.$themes;
      const validatedThemes = ThemesArraySchema(themesValue);
      
      if (!(validatedThemes instanceof type.errors)) {
        return [jsonFileKeys[0], validatedThemes];
      }
    }
  }

  // Check if there's a dedicated $themes file (could be array or object with $themes)
  const themesFile = json["$themes"];
  if (themesFile) {
    // First try as an object with $themes property
    if (isObject(themesFile) && "$themes" in themesFile) {
      const themesValue = themesFile.$themes;
      const validatedThemes = ThemesArraySchema(themesValue);
      
      if (!(validatedThemes instanceof type.errors)) {
        return ["$themes", validatedThemes];
      }
    }
    
    // Then try as a direct array of themes
    const validatedAsArray = ThemesArraySchema(themesFile);
    if (!(validatedAsArray instanceof type.errors)) {
      return ["$themes", validatedAsArray];
    }
  }

  return undefined;
};

/**
 * Extracts an ordered array of set names from selectedTokenSets.
 * 
 * Handles both object and array formats:
 * - Object format: { "core": "enabled", "semantic": "source" } => ["core", "semantic"]
 * - Array format: [{ id: "core", status: "enabled" }] => ["core"]
 * 
 * @param selectedTokenSets - The selectedTokenSets from a theme
 * @returns Array of set names in order
 * 
 * @example
 * const sets = { core: "enabled", semantic: "source" };
 * const names = extractSetNames(sets);
 * // => ["core", "semantic"]
 * 
 * const setsArray = [{ id: "core", status: "enabled" }];
 * const namesFromArray = extractSetNames(setsArray);
 * // => ["core"]
 */
export const extractSetNames = (selectedTokenSets: SelectedTokenSets): string[] => {
  if (Array.isArray(selectedTokenSets)) {
    return selectedTokenSets.map((set) => set.id);
  }
  return Object.keys(selectedTokenSets);
};

/**
 * Resolves the collection of token sets to process.
 *
 * When activeTheme is provided:
 * - Resolves themes from jsonFiles
 * - Selects the specified theme (throws if not found)
 * - Returns the active sets from the theme
 *
 * When activeSets is provided:
 * - Returns the provided sets directly
 *
 * @param options - Processing options containing activeTheme or activeSets
 * @param jsonFiles - Collected JSON files
 * @returns Array of set names to process
 * @throws Error if activeTheme is specified but theme is not found or themes cannot be resolved
 */
function getActiveSets(
  options: Pick<ProcessTokensOptions, "activeTheme" | "activeSets">,
  jsonFiles: Record<string, unknown>,
): string[] {
  const { activeTheme, activeSets } = options;

  if (activeSets) return activeSets;

  if (activeTheme) {
    const resolvedThemes = resolveThemes(jsonFiles);

    if (!resolvedThemes) {
      throw new Error(`Theme "${activeTheme}" specified but no themes could be resolved from files`);
    }

    const [, themes] = resolvedThemes;
    const theme = selectTheme(resolvedThemes, activeTheme);

    if (!theme) {
      const availableThemes = resolvedThemes.map((t) => t.name).join(", ");
      throw new Error(
        `Theme "${activeTheme}" not found. Available themes: ${availableThemes}`,
      );
    }

    return extractSetNames(theme.selectedTokenSets);
  }

  return [];
}
