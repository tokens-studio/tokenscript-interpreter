// Shared theme configuration for both Monaco editor and Prism.js syntax highlighting
export const tokenscriptThemeColors = {
  // Core syntax colors (dark theme)
  keyword: "#C586C0", // Keywords (variable, if, else, etc.)
  type: "#4EC9B0", // Types (String, Number, Color, etc.)
  function: "#DCDCAA", // Functions (rgb, hsl, lighten, etc.)
  variable: "#9CDCFE", // Variables and identifiers
  reference: "#FF6B6B", // References (curly braces like {variable.name})
  string: "#CE9178", // Strings
  number: "#B5CEA8", // Numbers
  hexColor: "#FFB86C", // Hex colors
  comment: "#6A9955", // Comments
  operator: "#D4D4D4", // Operators (+, -, *, /, =, etc.)
  delimiter: "#D4D4D4", // Delimiters (parentheses, brackets, semicolons, etc.)

  // JSON-specific mappings
  jsonString: "#CE9178", // JSON string values
  jsonNumber: "#B5CEA8", // JSON number values
  jsonBoolean: "#569CD6", // JSON boolean values
  jsonNull: "#569CD6", // JSON null values
  jsonProperty: "#9CDCFE", // JSON property names
  jsonPunctuation: "#D4D4D4", // JSON punctuation

  // Editor colors (dark theme)
  background: "#18181b",
  foreground: "#e4e4e7",
  lineHighlight: "#27272a",
  selection: "#3f3f46",
  lineNumber: "#71717a",
  lineNumberActive: "#a1a1aa",
  gutterBackground: "#18181b",
  gutterBorder: "#27272a",
};

// Monaco theme definition
export const monacoThemeDefinition = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    {
      token: "keyword",
      foreground: tokenscriptThemeColors.keyword.substring(1),
    },
    { token: "type", foreground: tokenscriptThemeColors.type.substring(1) },
    {
      token: "function",
      foreground: tokenscriptThemeColors.function.substring(1),
    },
    { token: "variable.name", foreground: tokenscriptThemeColors.variable.substring(1) },
    { token: "identifier", foreground: tokenscriptThemeColors.variable.substring(1) },
    {
      token: "reference",
      foreground: tokenscriptThemeColors.reference.substring(1),
      fontStyle: "italic",
    },
    { token: "string", foreground: tokenscriptThemeColors.string.substring(1) },
    { token: "string.invalid", foreground: "f44747" },
    { token: "number", foreground: tokenscriptThemeColors.number.substring(1) },
    { token: "number.float", foreground: tokenscriptThemeColors.number.substring(1) },
    {
      token: "number.hex",
      foreground: tokenscriptThemeColors.hexColor.substring(1),
    },
    {
      token: "number.unit",
      foreground: tokenscriptThemeColors.number.substring(1),
    },
    {
      token: "comment",
      foreground: tokenscriptThemeColors.comment.substring(1),
      fontStyle: "italic",
    },
    {
      token: "operator",
      foreground: tokenscriptThemeColors.operator.substring(1),
    },
    { token: "delimiter", foreground: tokenscriptThemeColors.delimiter.substring(1) },
  ],
  colors: {
    "editor.background": tokenscriptThemeColors.background,
    "editor.foreground": tokenscriptThemeColors.foreground,
    "editor.lineHighlightBackground": tokenscriptThemeColors.lineHighlight,
    "editor.selectionBackground": tokenscriptThemeColors.selection,
    "editorLineNumber.foreground": tokenscriptThemeColors.lineNumber,
    "editorLineNumber.activeForeground": tokenscriptThemeColors.lineNumberActive,
    "editorGutter.background": tokenscriptThemeColors.gutterBackground,
    "editorCursor.foreground": "#C586C0",
    "editor.selectionHighlightBackground": "#C586C015",
    "editor.inactiveSelectionBackground": "#3a3d41",
    "editorWhitespace.foreground": "#3b3a32",
    "editorIndentGuide.background": "#404040",
    "editorIndentGuide.activeBackground": "#C586C0",
    "scrollbar.shadow": "#00000033",
    "scrollbarSlider.background": "#79797966",
    "scrollbarSlider.hoverBackground": "#646464b3",
    "scrollbarSlider.activeBackground": "#bfbfbf66",
    "editor.wordHighlightBackground": "#C586C020",
    "editor.wordHighlightStrongBackground": "#C586C025",
    "editorBracketMatch.background": "#C586C025",
    "editorBracketMatch.border": "#C586C0",
  },
};

// CSS custom properties for Prism.js
export const prismThemeCss = `
:root {
  --tokenscript-keyword: ${tokenscriptThemeColors.keyword};
  --tokenscript-type: ${tokenscriptThemeColors.type};
  --tokenscript-function: ${tokenscriptThemeColors.function};
  --tokenscript-variable: ${tokenscriptThemeColors.variable};
  --tokenscript-reference: ${tokenscriptThemeColors.reference};
  --tokenscript-string: ${tokenscriptThemeColors.string};
  --tokenscript-number: ${tokenscriptThemeColors.number};
  --tokenscript-hex-color: ${tokenscriptThemeColors.hexColor};
  --tokenscript-comment: ${tokenscriptThemeColors.comment};
  --tokenscript-operator: ${tokenscriptThemeColors.operator};
  --tokenscript-delimiter: ${tokenscriptThemeColors.delimiter};
  
  --tokenscript-json-string: ${tokenscriptThemeColors.jsonString};
  --tokenscript-json-number: ${tokenscriptThemeColors.jsonNumber};
  --tokenscript-json-boolean: ${tokenscriptThemeColors.jsonBoolean};
  --tokenscript-json-null: ${tokenscriptThemeColors.jsonNull};
  --tokenscript-json-property: ${tokenscriptThemeColors.jsonProperty};
  --tokenscript-json-punctuation: ${tokenscriptThemeColors.jsonPunctuation};
}
`;
