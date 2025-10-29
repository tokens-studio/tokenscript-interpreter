import type { languages } from "monaco-editor";
import {
  BUILTIN_FUNCTIONS,
  KEYWORDS,
  MONACO_PATTERNS,
  OPERATORS,
  PATTERNS,
  TYPES,
  UNITS,
} from "./spec.js";

export const tokenscriptLanguageDefinition: languages.IMonarchLanguage = {
  keywords: [...KEYWORDS],
  types: [...TYPES],
  colorFunctions: [...BUILTIN_FUNCTIONS],
  units: [...UNITS],
  operators: [...OPERATORS],
  symbols: /[=><!~?:&|+\-*/^%]+/,

  tokenizer: {
    root: [
      // Comments - must come first
      [PATTERNS.comment, "comment"],

      // Strings - Monaco requires state-based tokenization for multi-line strings
      // Cannot use PATTERNS.string because Monaco needs separate start/end tokens
      [MONACO_PATTERNS.stringInvalidDouble, "string.invalid"],
      [MONACO_PATTERNS.stringInvalidSingle, "string.invalid"],
      [MONACO_PATTERNS.stringStartDouble, "string", "@string_double"],
      [MONACO_PATTERNS.stringStartSingle, "string", "@string_single"],

      // TokenScript references with curly braces
      [PATTERNS.reference, "reference"],

      // Hex colors
      [PATTERNS.hexColor, "number.hex"],

      // Numbers with units - Monaco requires capture groups for dynamic unit validation
      // Cannot use PATTERNS.numberWithUnit because Monaco needs $2 to validate against @units
      [
        MONACO_PATTERNS.numberWithDynamicUnit,
        {
          cases: {
            "$2@units": "number.unit",
            "@default": "number",
          },
        },
      ],

      // Float numbers - must come before integer pattern to match decimals first
      [PATTERNS.float, "number.float"],

      // Integer numbers
      [PATTERNS.number, "number"],

      // Color types (Color.Hex, Color.Rgb, etc.)
      [PATTERNS.colorType, "type"],

      // Method calls (.method())
      [PATTERNS.method, "method"],

      // Property access (.property)
      [PATTERNS.property, "property"],

      // Identifiers and keywords
      [
        PATTERNS.identifier,
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
      [/[()[\]]/, "delimiter"],
      [/[<>]=?/, "operator"],
      [/[=!]=?/, "operator"],
      [/&&|\|\|/, "operator"],
      [/[+\-*/^%]/, "operator"],
      [/[;:,]/, "delimiter"],
      [/@symbols/, "operator"],
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

    // Whitespace
    whitespace: [[/[ \t\r\n]+/, "white"]],
  },
};

export const tokenscriptLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: "//",
  },
  brackets: [
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"', notIn: ["string"] },
    { open: "'", close: "'", notIn: ["string"] },
  ],
  surroundingPairs: [
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*\/\/\s*#?region\b/,
      end: /^\s*\/\/\s*#?endregion\b/,
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([a-zA-Z_$][\w$]*)/g,
  indentationRules: {
    increaseIndentPattern: /^((?!.*?\/\*).*)*\[[^\]]*$/,
    decreaseIndentPattern: /^((?!.*?\/\*).*)*\].*$/,
  },
};
