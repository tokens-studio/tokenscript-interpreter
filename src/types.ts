import type { Config } from "@interpreter/config/config";

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
  ELIF = "elif",
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

export interface Token {
  type: TokenType;
  value: any;
  line: number;
}

export interface ASTNode {
  token?: Token;
  nodeType: string;
}

export interface ISymbolType {
  type: string;
  value: any;

  cloneIfMutable(): ISymbolType;
  deepCopy(): ISymbolType;

  typeEquals(other: ISymbolType): boolean;
  equals(other: ISymbolType): boolean;
  validValue(value: any): boolean;

  toJSON?(): any;
  toString(): string;
  getTypeName(): string;

  hasMethod?(methodName: string, args: ISymbolType[]): boolean;
  callMethod?(methodName: string, args: ISymbolType[]): ISymbolType | null | undefined;
  hasAttribute?(attributeName: string): boolean;
  getAttribute?(attributeName: string): ISymbolType | null;
  setAttribute?(attributeName: string, value: ISymbolType, config?: Config): void;
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

export type ReferenceRecordValue = string | number | ISymbolType;

export type ReferenceRecord = Record<string, ReferenceRecordValue | Array<ReferenceRecordValue>>;
