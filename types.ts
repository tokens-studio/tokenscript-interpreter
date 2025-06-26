// Enums from config.py and lexer.py

export enum Operations {
  SUBTRACT = "-",
  ADD = "+",
  MULTIPLY = "*",
  DIVIDE = "/",
  POWER = "^",
  LOGIC_AND = "&&",
  LOGIC_OR = "||",
  LOGIC_NOT = "!",
}

export enum SupportedFormats {
  PX = "px",
  EM = "em",
  REM = "rem",
  VW = "vw",
  VH = "vh",
  PT = "pt",
  IN = "in",
  CM = "cm",
  MM = "mm",
  DEG = "deg",
  S = "s",
  PERCENTAGE = "%",
}

export enum ReservedKeyword {
  TRUE = "true",
  FALSE = "false",
  NULL = "null",
  UNDEFINED = "undefined",
  WHILE = "while",
  IF = "if",
  ELSE = "else",
  RETURN = "return",
  VARIABLE = "variable",
}

export enum TokenType {
  REFERENCE = "REFERENCE",
  NUMBER = "NUMBER",
  OPERATION = "OPERATION",
  FORMAT = "FORMAT",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  EOF = "EOF",
  COMMA = "COMMA",
  HEX_COLOR = "HEX_COLOR",
  STRING = "STRING",
  EXPLICIT_STRING = "EXPLICIT_STRING",
  ASSIGN = "ASSIGN",
  IS_EQ = "IS_EQ",
  IS_GT = "GT",
  IS_LT = "LT",
  IS_GT_EQ = "IS_GT_EQ",
  IS_LT_EQ = "IS_LT_EQ",
  IS_NOT_EQ = "IS_NOT_EQ",
  RESERVED_KEYWORD = "RESERVED_KEYWORD",
  SEMICOLON = "SEMICOLON",
  LOGIC_NOT = "LOGIC_NOT",
  COLON = "COLON",
  DOT = "DOT",
  LOGIC_AND = "LOGIC_AND",
  LOGIC_OR = "LOGIC_OR",
  LBLOCK = "LBLOCK",
  RBLOCK = "RBLOCK",
}

// Token structure
export interface Token {
  type: TokenType;
  value: any; // Can be string, Operations enum, SupportedFormats enum, ReservedKeyword enum
  line: number;
}

// AST Node base
export interface ASTNode {
  token?: Token; // Optional, as not all nodes directly correspond to a single token (e.g., StatementList)
  // Add a common property if needed, like a 'type' string for node identification during visitation
  nodeType: string;
}

// Forward declaration for mutually recursive types if needed, e.g. for SymbolType methods
export interface ISymbolType {
  type: string;
  value: any;

  valid_value(value: any): boolean;
  toString(): string; // JS equivalent of __repr__ or __str__
  equals(other: ISymbolType): boolean; // JS equivalent of __eq__
  toJSON?(): any; // Optional JSON serialization

  hasMethod?(methodName: string, args: ISymbolType[]): boolean;
  callMethod?(methodName: string, args: ISymbolType[]): ISymbolType | null | undefined;
  hasAttribute?(attributeName: string): boolean;
  getAttribute?(attributeName: string): ISymbolType | null;
  setAttribute?(attributeName: string, value: ISymbolType): void;
}

export type InterpreterValue =
  | ISymbolType
  | string
  | number
  | boolean
  | null
  | Array<InterpreterValue>;

export interface LanguageOptions {
  MAX_ITERATIONS: number;
}

export const UNINTERPRETED_KEYWORDS: string[] = [
  "inside",
  "outside",
  "above",
  "below",
  "left",
  "right",
  "top",
  "bottom",
  "before",
  "after",
  "between",
  "uppercase",
  "lowercase",
  "underline",
  "none",
  "innerShadow",
  "outerShadow",
  "shadow",
];

// For Interpreter references
export type ReferenceRecord = Record<
  string,
  string | number | ISymbolType | Array<string | number | ISymbolType>
>;
