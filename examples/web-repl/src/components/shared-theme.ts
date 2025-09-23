// Shared theme configuration for both Monaco editor and Prism.js syntax highlighting
export const tokenscriptThemeColors = {
  // Core syntax colors
  keyword: "#0000FF", // Keywords (variable, if, else, etc.)
  type: "#267f99", // Types (String, Number, Color, etc.)
  function: "#795da3", // Functions (rgb, hsl, lighten, etc.)
  variable: "#001080", // Variables and identifiers
  reference: "#E31837", // References (curly braces like {variable.name})
  string: "#a31515", // Strings
  number: "#098658", // Numbers
  hexColor: "#E07B39", // Hex colors
  comment: "#999999", // Comments
  operator: "#D73A49", // Operators (+, -, *, /, =, etc.)
  delimiter: "#24292e", // Delimiters (parentheses, brackets, semicolons, etc.)

  // JSON-specific mappings
  jsonString: "#a31515", // JSON string values (maps to string)
  jsonNumber: "#098658", // JSON number values (maps to number)
  jsonBoolean: "#795da3", // JSON boolean values (maps to function color)
  jsonNull: "#D73A49", // JSON null values (maps to operator color)
  jsonProperty: "#267f99", // JSON property names (maps to type color)
  jsonPunctuation: "#24292e", // JSON punctuation (maps to delimiter)

  // Editor colors
  background: "#ffffff",
  foreground: "#000000",
  lineHighlight: "#f8f8ff",
  selection: "#add6ff",
  lineNumber: "#666666",
  lineNumberActive: "#333333",
  gutterBackground: "#fafafa",
  gutterBorder: "#e8e8e8",
};

// Monaco theme definition
export const monacoThemeDefinition = {
  base: "vs" as const,
  inherit: true,
  rules: [
    {
      token: "keyword",
      foreground: tokenscriptThemeColors.keyword.substring(1),
      fontStyle: "bold",
    },
    { token: "type", foreground: tokenscriptThemeColors.type.substring(1), fontStyle: "bold" },
    {
      token: "function",
      foreground: tokenscriptThemeColors.function.substring(1),
      fontStyle: "bold",
    },
    { token: "variable.name", foreground: tokenscriptThemeColors.variable.substring(1) },
    { token: "identifier", foreground: tokenscriptThemeColors.variable.substring(1) },
    {
      token: "reference",
      foreground: tokenscriptThemeColors.reference.substring(1),
      fontStyle: "italic",
      fontWeight: "bold",
    },
    { token: "string", foreground: tokenscriptThemeColors.string.substring(1) },
    { token: "string.invalid", foreground: "cd3131" },
    { token: "number", foreground: tokenscriptThemeColors.number.substring(1) },
    { token: "number.float", foreground: tokenscriptThemeColors.number.substring(1) },
    {
      token: "number.hex",
      foreground: tokenscriptThemeColors.hexColor.substring(1),
      fontStyle: "bold",
    },
    {
      token: "number.unit",
      foreground: tokenscriptThemeColors.number.substring(1),
      fontStyle: "bold",
    },
    {
      token: "comment",
      foreground: tokenscriptThemeColors.comment.substring(1),
      fontStyle: "italic",
    },
    {
      token: "operator",
      foreground: tokenscriptThemeColors.operator.substring(1),
      fontStyle: "bold",
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
    "editorGutter.border": tokenscriptThemeColors.gutterBorder,
    "scrollbar.shadow": "#00000010",
    "scrollbarSlider.background": "#c0c0c040",
    "scrollbarSlider.hoverBackground": "#c0c0c060",
    "scrollbarSlider.activeBackground": "#c0c0c080",
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
