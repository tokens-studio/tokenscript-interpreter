/**
 * Shared syntax highlighting patterns for TokenScript language
 * Used by both Monaco Editor (VSCode) and Prism.js implementations
 */

import {
  BooleanSymbol,
  ColorSymbol,
  DictionarySymbol,
  ListSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "@interpreter/symbols";
import { Operations, ReservedKeyword, SupportedFormats } from "@src/types";

export const KEYWORDS = Object.values(ReservedKeyword);

export const TYPES = [
  StringSymbol.type,
  NumberSymbol.type,
  NumberWithUnitSymbol.type,
  ColorSymbol.type,
  ListSymbol.type,
  DictionarySymbol.type,
  BooleanSymbol.type,
] as const;

export const BUILTIN_FUNCTIONS = [
  "rgb",
  "hsl",
  "srgb",
  "lrgb",
  "hex",
  "oklch",
  "oklchRamp",
  "lighten",
  "darken",
  "saturate",
  "desaturate",
  "spin",
  "mix",
  "round_to",
  "snap",
  "remap",
  "pow",
  "linear-gradient",
  "type",
] as const;

export const UNITS = Object.values(SupportedFormats);

export const OPERATORS = [
  ...Object.values(Operations),
  "=",
  ">",
  "<",
  ":",
  "==",
  "<=",
  ">=",
  "!=",
] as const;

const numberWithUnit = createUnitPattern(UNITS);

export const PATTERNS = {
  /** Single-line comments */
  comment: /\/\/.*/,

  /** String literals (single or double quotes) */
  string: /(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1/,

  /** TokenScript references with curly braces (e.g., {token.path}) */
  reference: /\{[^}]+\}/,

  /** Hex color codes (#RGB, #RRGGBB, #RRGGBBAA) */
  hexColor: /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/,

  /** Numbers with CSS units (e.g., 10px, 1.5em, 45deg) - dynamically constructed from UNITS */
  numberWithUnit,

  /** Plain numbers (integers and floats, including scientific notation) */
  number: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/,

  /** Float numbers with decimal point */
  float: /\d*\.\d+(?:[eE][-+]?\d+)?/,

  /** Identifiers and keywords */
  identifier: /[a-zA-Z_$][\w$]*/,

  /** Operators */
  operator: /[+\-*/%=<>!&|^~?:]+/,

  /** Punctuation */
  punctuation: /[[\]();,.:]/,

  /** Method calls (e.g., .methodName() ) */
  method: /\.\w+(?=\()/,

  /** Property access (e.g., .propertyName) */
  property: /\.\w+\b(?!\()/,

  /** Color type constructors (e.g., Color, Color.Rgb, Color.Hex) - accepts any subtype */
  colorType: /\bColor(?:\.\w+)?\b/,
} as const;

/**
 * Monaco-specific patterns that cannot be shared due to Monaco's tokenizer requirements
 * Monaco uses different syntax for string state transitions and lookahead
 */
export const MONACO_PATTERNS = {
  /** Invalid string (unterminated double quote) - Monaco-specific for error highlighting */
  stringInvalidDouble: /"([^"\\]|\\.)*$/,

  /** Invalid string (unterminated single quote) - Monaco-specific for error highlighting */
  stringInvalidSingle: /'([^'\\]|\\.)*$/,

  /** String start (double quote) - Monaco-specific for state-based tokenization */
  stringStartDouble: /"/,

  /** String start (single quote) - Monaco-specific for state-based tokenization */
  stringStartSingle: /'/,

  /** Number with any unit (captures unit for dynamic validation) - Monaco-specific for unit validation */
  numberWithDynamicUnit: /\d+(\.\d+)?([a-zA-Z%]+)\b/,
} as const;

export function createKeywordPattern(keywords: readonly string[]): RegExp {
  return new RegExp(`\\b(?:${keywords.join("|")})\\b`);
}

export function createUnitPattern(units: readonly string[]): RegExp {
  const escapedUnits = units.map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b\\d+(?:\\.\\d+)?(?:${escapedUnits.join("|")})(?!\\w)`);
}
