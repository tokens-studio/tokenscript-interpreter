import type { languages } from "monaco-editor";

// TokenScript language definition for Monaco Editor
export const tokenscriptLanguageDefinition: languages.IMonarchLanguage = {
  // Keywords and operators
  keywords: [
    "if",
    "else",
    "for",
    "in",
    "while",
    "do",
    "break",
    "continue",
    "function",
    "return",
    "var",
    "let",
    "const",
    "true",
    "false",
    "null",
    "undefined",
  ],

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
      // Identifiers and keywords
      [
        /[a-zA-Z_$][\w$]*/,
        {
          cases: {
            "@keywords": "keyword",
            "@default": "identifier",
          },
        },
      ],

      // Whitespace
      { include: "@whitespace" },

      // Delimiters and operators
      [/[{}()[\]]/, "@brackets"],
      [/[<>]=?/, "operator"],
      [/@symbols/, "operator"],

      // Numbers
      [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
      [/\d+/, "number"],

      // Color values (hex, rgb, hsl, etc.)
      [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/, "number.hex"],
      [/rgb\(/, { token: "keyword", next: "@colorFunction" }],
      [/rgba\(/, { token: "keyword", next: "@colorFunction" }],
      [/hsl\(/, { token: "keyword", next: "@colorFunction" }],
      [/hsla\(/, { token: "keyword", next: "@colorFunction" }],

      // Units
      [/\d+(\.\d+)?(px|em|rem|vh|vw|%|deg|rad|turn)/, "number.unit"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-terminated string
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],

      // Template literals
      [/`/, "string", "@template"],
    ],

    // Color function handling
    colorFunction: [
      [/[^)]+/, "number"],
      [/\)/, { token: "keyword", next: "@pop" }],
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
      start: new RegExp("^\\s*//\\s*#?region\\b"),
      end: new RegExp("^\\s*//\\s*#?endregion\\b"),
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([a-zA-Z_$][\w$]*)/g,
  indentationRules: {
    increaseIndentPattern: /^((?!.*?\/\*).*)*\{[^}]*$/,
    decreaseIndentPattern: /^((?!.*?\/\*).*)*\}.*$/,
  },
};