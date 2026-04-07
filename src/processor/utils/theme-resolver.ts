import { z } from "@tokens-studio/schema-validation";
import { isObject } from "@/src/interpreter/utils/type";

/**
 * Validation for the `$themes.json` file format used by Figma Tokens
 * Studio. NOT part of the schema language; this is application config
 * that travels alongside token sets.
 *
 * The `$themes.json` data carries many extra fields beyond what this
 * resolver consumes (`id`, `$figmaStyleReferences`,
 * `$figmaCollectionVariableIds`, etc. — Figma plugin bookkeeping).
 * The schemas below are intentionally LOOSE on every object level: in
 * zod v4 `z.object()` strips unknown keys silently rather than
 * failing, which matches what real `$themes.json` files need.
 */

// Old object format: { "core": "enabled", "semantic": "source" }
const TokenSetStatus = z.enum(["enabled", "source"]);
const SelectedTokenSetsObjectSchema = z.record(z.string(), TokenSetStatus);

// New array format: [{ id: "core", status: "enabled" }]
const SelectedTokenSetsArraySchema = z.array(
  z.object({
    id: z.string(),
    status: TokenSetStatus,
  }),
);

// Either format is accepted.
const SelectedTokenSetsSchema = z.union([
  SelectedTokenSetsObjectSchema,
  SelectedTokenSetsArraySchema,
]);

const ThemeSchema = z.object({
  name: z.string(),
  selectedTokenSets: SelectedTokenSetsSchema,
  figmaCollectionId: z.string().optional(),
  figmaModeId: z.string().optional(),
  group: z.string().optional(),
});

const ThemesArraySchema = z.array(ThemeSchema);

export type ThemesArray = z.infer<typeof ThemesArraySchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type SelectedTokenSets = z.infer<typeof SelectedTokenSetsSchema>;
export type SelectedTokenSetsObject = z.infer<typeof SelectedTokenSetsObjectSchema>;
export type SelectedTokenSetsArray = z.infer<typeof SelectedTokenSetsArraySchema>;

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
export const selectTheme = (themes: ThemesArray, themeName: string): Theme | undefined => {
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
export const selectThemeOrFirst = (themes: ThemesArray, themeName?: string): Theme | undefined => {
  if (!themeName) {
    return themes[0];
  }

  const theme = selectTheme(themes, themeName);
  return theme ?? themes[0];
};

/**
 * Resolves themes from collected json.
 *
 * Validates the structure with zod (via the schema-validation
 * library's `z` re-export):
 * - Each theme must have a `name` string property
 * - Each theme must have a `selectedTokenSets` property in either
 *   the old object format (`{ name: "enabled" | "source" }`) or the
 *   new array format (`[{ id, status }]`)
 * - Optional properties: figmaCollectionId, figmaModeId, group
 * - Extra fields are silently passed through (real-world
 *   `$themes.json` files carry Figma plugin bookkeeping fields).
 *
 * @param jsonFiles - Record of collected jsons from file-collector
 * @returns Tuple of [path, themes array] or undefined if no valid themes found
 */
export const resolveThemes = (
  jsonFiles: Record<string, unknown>,
): [string, ThemesArray] | undefined => {
  const themesFile = jsonFiles.$themes;
  if (themesFile) {
    // First try as an object with $themes property
    if (isObject(themesFile) && "$themes" in themesFile) {
      const inner = ThemesArraySchema.safeParse(themesFile.$themes);
      if (inner.success) {
        return ["$themes", inner.data];
      }
    }

    // Then try as a direct array of themes
    const direct = ThemesArraySchema.safeParse(themesFile);
    if (direct.success) {
      return ["$themes", direct.data];
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
