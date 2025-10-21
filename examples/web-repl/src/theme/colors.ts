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
  
  // Logo/Brand colors
  logoAction: string;
  
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
  background: "#fafbfc",
  foreground: "#24292e",
  border: "#d0d7de",
  
  surface: "#ffffff",
  surfaceHover: "#f6f8fa",
  surfaceActive: "#eaeef2",
  
  primary: "#0969da",
  primaryHover: "#0860ca",
  
  logoAction: "#10b981", // emerald-500
  
  error: "#cf222e",
  errorLight: "#ffebe6",
  success: "#1a7f37",
  successLight: "#dafbe1",
  warning: "#fb8500",
  
  textPrimary: "#24292e",
  textSecondary: "#57606a",
  textMuted: "#848d97",
  
  editorBackground: "#ffffff",
  editorForeground: "#24292e",
  editorLineHighlight: "#f6f8fa",
  editorSelection: "#d0d7de",
  editorLineNumber: "#848d97",
  editorLineNumberActive: "#24292e",
  editorGutterBackground: "#fafbfc",
  editorGutterBorder: "#d0d7de",
  
  syntaxKeyword: "#d2691e",
  syntaxType: "#005a9c",
  syntaxFunction: "#6e40c4",
  syntaxVariable: "#24292e",
  syntaxString: "#0a3069",
  syntaxNumber: "#0550ae",
  syntaxComment: "#57606a",
  syntaxOperator: "#24292e",
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
  
  logoAction: "#34d399", // emerald-400 (matches the logo color)
  
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
