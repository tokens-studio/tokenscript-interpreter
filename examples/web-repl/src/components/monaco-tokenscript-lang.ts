import type { languages } from "monaco-editor";

// TokenScript language definition for Monaco Editor
export const tokenscriptLanguageDefinition: languages.IMonarchLanguage = {
  // Keywords and operators
  keywords: [
    "variable",
    "if",
    "else",
    "elif",
    "while",
    "for",
    "return",
    "true",
    "false",
    "null",
    "undefined",
  ],

  // TokenScript types
  types: ["String", "Number", "NumberWithUnit", "Color", "List", "Dictionary", "Boolean"],

  // Color functions and methods
  colorFunctions: [
    "rgb",
    "rgba",
    "hsl",
    "hsla",
    "lighten",
    "darken",
    "saturate",
    "desaturate",
    "spin",
    "mix",
  ],

  // Units
  units: ["px", "em", "rem", "vh", "vw", "%", "pt", "in", "cm", "mm", "deg", "rad", "turn"],

  operators: [
    "=",
    ">",
    "<",
    "!",
    "~",
    "?",
    ":",
    "==",
    "<=",
    ">=",
    "!=",
    "&&",
    "||",
    "++",
    "--",
    "+",
    "-",
    "*",
    "/",
    "&",
    "|",
    "^",
    "%",
    "<<",
    ">>",
    ">>>",
    "+=",
    "-=",
    "*=",
    "/=",
    "&=",
    "|=",
    "^=",
    "%=",
    "<<=",
    ">>=",
    ">>>=",
  ],

  // Symbols used in the language
  symbols: /[=><!~?:&|+\-*/^%]+/,

  // Define token patterns
  tokenizer: {
    root: [
      // TokenScript references with curly braces
      [/\{[^}]+\}/, "reference"],

      // Hex colors
      [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/, "number.hex"],

      // Numbers with units - must come before plain numbers
      [
        /\d+(\.\d+)?([a-zA-Z%]+)\b/,
        {
          cases: {
            "$2@units": "number.unit",
            "@default": "number",
          },
        },
      ],

      // Float numbers
      [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],

      // Integer numbers
      [/\d+/, "number"],

      // Identifiers and keywords
      [
        /[a-zA-Z_$][\w$]*/,
        {
          cases: {
            "@keywords": "keyword",
            "@types": "type",
            "@colorFunctions": "function",
            "@default": "identifier",
          },
        },
      ],

      // Whitespace
      { include: "@whitespace" },

      // Delimiters and operators
      [/[{}()[\]]/, "delimiter"],
      [/[<>]=?/, "operator"],
      [/[=!]=?/, "operator"],
      [/&&|\|\|/, "operator"],
      [/[+\-*/^]/, "operator"],
      [/[;:,.]/, "delimiter"],
      [/@symbols/, "operator"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],

      // Template literals
      [/`/, "string", "@template"],
    ],

    // String handling
    string_double: [
      [/[^\\"]+/, "string"],
      [/"/, "string", "@pop"],
    ],

    string_single: [
      [/[^\\']+/, "string"],
      [/'/, "string", "@pop"],
    ],

    // Template literal handling
    template: [
      [/[^`$]+/, "string"],
      [/\$\{/, { token: "delimiter", next: "@templateExpression" }],
      [/`/, "string", "@pop"],
    ],

    templateExpression: [
      [/[^}]+/, "identifier"],
      [/\}/, { token: "delimiter", next: "@pop" }],
    ],

    // Whitespace and comments
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
    ],

    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"], // nested comment
      ["\\*/", "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
};

// Configuration for the language
export const tokenscriptLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"', notIn: ["string"] },
    { open: "'", close: "'", notIn: ["string"] },
    { open: "`", close: "`", notIn: ["string"] },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "`", close: "`" },
  ],
  folding: {
    markers: {
      start: /^\s*\/\/\s*#?region\b/,
      end: /^\s*\/\/\s*#?endregion\b/,
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([a-zA-Z_$][\w$]*)/g,
  indentationRules: {
    increaseIndentPattern: /^((?!.*?\/\*).*)*\{[^}]*$/,
    decreaseIndentPattern: /^((?!.*?\/\*).*)*\}.*$/,
  },
};
