// Centralized color theme system for light and dark modes

export type ThemeMode = "light" | "dark";

interface ColorTheme {
  // Base colors
  background: string;
  foreground: string;
  border: string;
  
  // Surface colors (panels, cards)
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  
  // Accent colors
  primary: string;
  primaryHover: string;
  
  // Status colors
  error: string;
  errorLight: string;
  success: string;
  successLight: string;
  warning: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Editor specific
  editorBackground: string;
  editorForeground: string;
  editorLineHighlight: string;
  editorSelection: string;
  editorLineNumber: string;
  editorLineNumberActive: string;
  editorGutterBackground: string;
  editorGutterBorder: string;
  
  // Syntax highlighting
  syntaxKeyword: string;
  syntaxType: string;
  syntaxFunction: string;
  syntaxVariable: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxComment: string;
  syntaxOperator: string;
}

export const lightTheme: ColorTheme = {
  background: "#f5f5f0",
  foreground: "#3c3c3c",
  border: "#d4d4d0",
  
  surface: "#ffffff",
  surfaceHover: "#f8f8f6",
  surfaceActive: "#f0f0ec",
  
  primary: "#8b7355",
  primaryHover: "#6e5c45",
  
  error: "#d14343",
  errorLight: "#fef2f2",
  success: "#4ade80",
  successLight: "#f0fdf4",
  warning: "#fb923c",
  
  textPrimary: "#1a1a1a",
  textSecondary: "#525252",
  textMuted: "#a3a3a3",
  
  editorBackground: "#ffffff",
  editorForeground: "#000000",
  editorLineHighlight: "#f8f8f6",
  editorSelection: "#e8e8e4",
  editorLineNumber: "#999999",
  editorLineNumberActive: "#333333",
  editorGutterBackground: "#fafafa",
  editorGutterBorder: "#e8e8e8",
  
  syntaxKeyword: "#0000FF",
  syntaxType: "#267f99",
  syntaxFunction: "#795da3",
  syntaxVariable: "#001080",
  syntaxString: "#a31515",
  syntaxNumber: "#098658",
  syntaxComment: "#999999",
  syntaxOperator: "#D73A49",
};

export const darkTheme: ColorTheme = {
  background: "#09090b",
  foreground: "#e4e4e7",
  border: "#27272a",
  
  surface: "#18181b",
  surfaceHover: "#27272a",
  surfaceActive: "#3f3f46",
  
  primary: "#a1a1aa",
  primaryHover: "#d4d4d8",
  
  error: "#f87171",
  errorLight: "#450a0a",
  success: "#4ade80",
  successLight: "#052e16",
  warning: "#fb923c",
  
  textPrimary: "#fafafa",
  textSecondary: "#d4d4d8",
  textMuted: "#71717a",
  
  editorBackground: "#18181b",
  editorForeground: "#e4e4e7",
  editorLineHighlight: "#27272a",
  editorSelection: "#3f3f46",
  editorLineNumber: "#71717a",
  editorLineNumberActive: "#a1a1aa",
  editorGutterBackground: "#18181b",
  editorGutterBorder: "#27272a",
  
  syntaxKeyword: "#C586C0",
  syntaxType: "#4EC9B0",
  syntaxFunction: "#DCDCAA",
  syntaxVariable: "#9CDCFE",
  syntaxString: "#CE9178",
  syntaxNumber: "#B5CEA8",
  syntaxComment: "#6A9955",
  syntaxOperator: "#D4D4D4",
};

// Current theme (can be changed to lightTheme for light mode)
export const currentTheme = darkTheme;

// Helper function to switch themes (for future light/dark mode toggle)
export function getTheme(mode: ThemeMode = "dark"): ColorTheme {
  return mode === "light" ? lightTheme : darkTheme;
}
