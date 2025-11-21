// Token groups with their types
export const TOKEN_GROUPS = [
  "Border Radius",
  "Color",
  "Opacity",
  "Dimensions",
  "Font Family",
  "Font Size",
  "Font Weight",
  "Letter Spacing",
  "Number",
  "Rotation",
  "Shadow",
  "Sizing",
  "Spacing",
  "Stroke Width",
  "Text Case",
  "Text Decoration",
  "Typography",
] as const

export type TokenGroup = (typeof TOKEN_GROUPS)[number]

// TokensMap type - Map<RefPath, TokenData>
export type TokensMap = Map<string, { $value: unknown; $type?: string }>

// State types
export interface AppState {
  themes: Map<string, string[]> // theme-name -> set-names
  sets: Map<string, TokensMap> // set-name -> tokens
  activeTheme: string | null
  activeSets: Set<string>
}

// Mock token sets
const CORE_TOKENS: TokensMap = new Map([
  ["color.primary.500", { $value: "#3b82f6", $type: "Color" }],
  ["color.primary.600", { $value: "#2563eb", $type: "Color" }],
  ["spacing.sm", { $value: "0.5rem", $type: "Spacing" }],
  ["spacing.md", { $value: "1rem", $type: "Spacing" }],
  ["spacing.lg", { $value: "1.5rem", $type: "Spacing" }],
  ["borderRadius.sm", { $value: "4px", $type: "Border Radius" }],
  ["borderRadius.md", { $value: "8px", $type: "Border Radius" }],
  ["borderRadius.lg", { $value: "12px", $type: "Border Radius" }],
  ["fontFamily.sans", { $value: "Inter, sans-serif", $type: "Font Family" }],
  ["fontFamily.mono", { $value: "Fira Code, monospace", $type: "Font Family" }],
  ["fontSize.xs", { $value: "12px", $type: "Font Size" }],
  ["fontSize.sm", { $value: "14px", $type: "Font Size" }],
  ["fontSize.md", { $value: "16px", $type: "Font Size" }],
  ["fontWeight.normal", { $value: 400, $type: "Font Weight" }],
  ["fontWeight.bold", { $value: 700, $type: "Font Weight" }],
])

const DARK_TOKENS: TokensMap = new Map([
  ["color.primary.500", { $value: "#60a5fa", $type: "Color" }],
  ["color.primary.600", { $value: "#3b82f6", $type: "Color" }],
  ["color.background", { $value: "#1f2937", $type: "Color" }],
  ["color.text", { $value: "#f9fafb", $type: "Color" }],
])

const LIGHT_TOKENS: TokensMap = new Map([
  ["color.primary.500", { $value: "#3b82f6", $type: "Color" }],
  ["color.primary.600", { $value: "#2563eb", $type: "Color" }],
  ["color.background", { $value: "#ffffff", $type: "Color" }],
  ["color.text", { $value: "#111827", $type: "Color" }],
])

const BRAND_TOKENS: TokensMap = new Map([
  ["color.secondary.500", { $value: "#8b5cf6", $type: "Color" }],
  ["color.accent", { $value: "#f59e0b", $type: "Color" }],
  ["shadow.sm", { $value: "0 1px 2px rgba(0,0,0,0.05)", $type: "Shadow" }],
  ["shadow.md", { $value: "0 4px 6px rgba(0,0,0,0.1)", $type: "Shadow" }],
])

const COMPONENTS_TOKENS: TokensMap = new Map([
  ["sizing.button.height", { $value: "40px", $type: "Sizing" }],
  ["sizing.input.height", { $value: "36px", $type: "Sizing" }],
  ["dimensions.icon.sm", { $value: "16px", $type: "Dimensions" }],
  ["dimensions.icon.md", { $value: "24px", $type: "Dimensions" }],
  ["opacity.50", { $value: 0.5, $type: "Opacity" }],
  ["opacity.75", { $value: 0.75, $type: "Opacity" }],
  ["letterSpacing.tight", { $value: "-0.025em", $type: "Letter Spacing" }],
  ["letterSpacing.wide", { $value: "0.025em", $type: "Letter Spacing" }],
  ["number.maxItems", { $value: 100, $type: "Number" }],
  ["rotation.45", { $value: "45deg", $type: "Rotation" }],
  ["strokeWidth.thin", { $value: "1px", $type: "Stroke Width" }],
  ["textCase.uppercase", { $value: "uppercase", $type: "Text Case" }],
  ["textDecoration.underline", { $value: "underline", $type: "Text Decoration" }],
  ["typography.heading", { $value: { fontFamily: "Inter", fontSize: "24px", fontWeight: 700 }, $type: "Typography" }],
])

// Initial state
export const INITIAL_STATE: AppState = {
  themes: new Map([
    ["Light Theme", ["core", "light", "brand", "components"]],
    ["Dark Theme", ["core", "dark", "brand", "components"]],
    ["Minimal", ["core", "light"]],
  ]),
  sets: new Map([
    ["core", CORE_TOKENS],
    ["dark", DARK_TOKENS],
    ["light", LIGHT_TOKENS],
    ["brand", BRAND_TOKENS],
    ["components", COMPONENTS_TOKENS],
  ]),
  activeTheme: "Light Theme",
  activeSets: new Set(["core", "light", "brand", "components"]),
}

// Helper to check if active sets match a theme
export function findMatchingTheme(
  themes: Map<string, string[]>,
  activeSets: Set<string>
): string | null {
  for (const [themeName, themeSets] of themes) {
    if (themeSets.length === activeSets.size && themeSets.every((s) => activeSets.has(s))) {
      return themeName
    }
  }
  return null
}

// Merge tokens from activated sets in order
export function mergeActiveSets(
  sets: Map<string, TokensMap>,
  activeSets: Set<string>,
  setOrder: string[]
): TokensMap {
  const merged: TokensMap = new Map()
  for (const setName of setOrder) {
    if (activeSets.has(setName)) {
      const tokenSet = sets.get(setName)
      if (tokenSet) {
        for (const [path, data] of tokenSet) {
          merged.set(path, data)
        }
      }
    }
  }
  return merged
}

// Get processor output from merged tokens
export function getProcessorOutput(tokens: TokensMap): Map<string, unknown> {
  const output: Map<string, unknown> = new Map()
  for (const [path, data] of tokens) {
    const value = data.$value
    output.set(path, typeof value === "object" ? JSON.stringify(value) : String(value))
  }
  return output
}

// State actions
export function activateTheme(state: AppState, themeName: string): AppState {
  const themeSets = state.themes.get(themeName)
  if (!themeSets) return state
  return {
    ...state,
    activeTheme: themeName,
    activeSets: new Set(themeSets),
  }
}

export function deactivateTheme(state: AppState): AppState {
  return {
    ...state,
    activeTheme: null,
    activeSets: new Set(),
  }
}

export function toggleSet(state: AppState, setName: string): AppState {
  const newActiveSets = new Set(state.activeSets)
  if (newActiveSets.has(setName)) {
    newActiveSets.delete(setName)
  } else {
    newActiveSets.add(setName)
  }
  const newActiveTheme = findMatchingTheme(state.themes, newActiveSets)
  return {
    ...state,
    activeTheme: newActiveTheme,
    activeSets: newActiveSets,
  }
}

export function toggleTheme(state: AppState, themeName: string): AppState {
  if (state.activeTheme === themeName) {
    return deactivateTheme(state)
  }
  return activateTheme(state, themeName)
}

// Mock token data - Map<RefPath, TokenData>
export const MOCK_TOKENS: Map<string, { $value: unknown; $type?: string }> = new Map([
  ["color.primary.500", { $value: "#3b82f6", $type: "Color" }],
  ["color.primary.600", { $value: "#2563eb", $type: "Color" }],
  ["color.secondary.500", { $value: "#8b5cf6", $type: "Color" }],
  ["spacing.sm", { $value: "0.5rem", $type: "Spacing" }],
  ["spacing.md", { $value: "1rem", $type: "Spacing" }],
  ["spacing.lg", { $value: "1.5rem", $type: "Spacing" }],
  ["sizing.button.height", { $value: "40px", $type: "Sizing" }],
  ["sizing.input.height", { $value: "36px", $type: "Sizing" }],
  ["borderRadius.sm", { $value: "4px", $type: "Border Radius" }],
  ["borderRadius.md", { $value: "8px", $type: "Border Radius" }],
  ["borderRadius.lg", { $value: "12px", $type: "Border Radius" }],
  ["fontFamily.sans", { $value: "Inter, sans-serif", $type: "Font Family" }],
  ["fontFamily.mono", { $value: "Fira Code, monospace", $type: "Font Family" }],
  ["fontSize.xs", { $value: "12px", $type: "Font Size" }],
  ["fontSize.sm", { $value: "14px", $type: "Font Size" }],
  ["fontSize.md", { $value: "16px", $type: "Font Size" }],
  ["fontWeight.normal", { $value: 400, $type: "Font Weight" }],
  ["fontWeight.bold", { $value: 700, $type: "Font Weight" }],
  ["opacity.50", { $value: 0.5, $type: "Opacity" }],
  ["opacity.75", { $value: 0.75, $type: "Opacity" }],
  ["letterSpacing.tight", { $value: "-0.025em", $type: "Letter Spacing" }],
  ["letterSpacing.wide", { $value: "0.025em", $type: "Letter Spacing" }],
  ["shadow.sm", { $value: "0 1px 2px rgba(0,0,0,0.05)", $type: "Shadow" }],
  ["shadow.md", { $value: "0 4px 6px rgba(0,0,0,0.1)", $type: "Shadow" }],
  ["dimensions.icon.sm", { $value: "16px", $type: "Dimensions" }],
  ["dimensions.icon.md", { $value: "24px", $type: "Dimensions" }],
  ["number.maxItems", { $value: 100, $type: "Number" }],
  ["rotation.45", { $value: "45deg", $type: "Rotation" }],
  ["strokeWidth.thin", { $value: "1px", $type: "Stroke Width" }],
  ["textCase.uppercase", { $value: "uppercase", $type: "Text Case" }],
  ["textDecoration.underline", { $value: "underline", $type: "Text Decoration" }],
  ["typography.heading", { $value: { fontFamily: "Inter", fontSize: "24px", fontWeight: 700 }, $type: "Typography" }],
])

// Mock ProcessorOutput
export const MOCK_OUTPUT: Map<string, unknown> = new Map([
  ["color.primary.500", "#3b82f6"],
  ["color.primary.600", "#2563eb"],
  ["color.secondary.500", "#8b5cf6"],
  ["spacing.sm", "0.5rem"],
  ["spacing.md", "1rem"],
  ["spacing.lg", "1.5rem"],
  ["sizing.button.height", "40px"],
  ["sizing.input.height", "36px"],
  ["borderRadius.sm", "4px"],
  ["borderRadius.md", "8px"],
  ["borderRadius.lg", "12px"],
  ["fontFamily.sans", "Inter, sans-serif"],
  ["fontFamily.mono", "Fira Code, monospace"],
  ["fontSize.xs", "12px"],
  ["fontSize.sm", "14px"],
  ["fontSize.md", "16px"],
  ["fontWeight.normal", "400"],
  ["fontWeight.bold", "700"],
  ["opacity.50", "0.5"],
  ["opacity.75", "0.75"],
  ["letterSpacing.tight", "-0.025em"],
  ["letterSpacing.wide", "0.025em"],
  ["shadow.sm", "0 1px 2px rgba(0,0,0,0.05)"],
  ["shadow.md", "0 4px 6px rgba(0,0,0,0.1)"],
  ["dimensions.icon.sm", "16px"],
  ["dimensions.icon.md", "24px"],
  ["number.maxItems", "100"],
  ["rotation.45", "45deg"],
  ["strokeWidth.thin", "1px"],
  ["textCase.uppercase", "uppercase"],
  ["textDecoration.underline", "underline"],
  ["typography.heading", '{"fontFamily":"Inter","fontSize":"24px","fontWeight":700}'],
])
