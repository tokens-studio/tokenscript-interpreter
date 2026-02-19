import type { ASTNode, Token } from "@src/types";

/**
 * Parse state indicating whether the input was complete or incomplete
 */
export enum ParseState {
  COMPLETE = "complete",
  INCOMPLETE = "incomplete",
}

/**
 * Types of incomplete constructs that can be detected
 */
export enum IncompleteType {
  /** Missing closing } in reference like {color */
  UNCLOSED_REFERENCE = "unclosed_reference",
  /** Missing closing quote in string like "hello */
  UNCLOSED_STRING = "unclosed_string",
  /** Missing closing ) in expression like (1 + 2 */
  UNCLOSED_PAREN = "unclosed_paren",
  /** Missing closing ) in function call like func(1, 2 */
  UNCLOSED_FUNCTION = "unclosed_function",
  /** Missing right operand in binary operation like 1 + */
  MISSING_OPERAND = "missing_operand",
  /** Trailing dot without property name like {ref}. */
  TRAILING_DOT = "trailing_dot",
}

/**
 * Information about an incomplete construct in the input
 */
export interface IncompleteInfo {
  /** Type of incomplete construct */
  type: IncompleteType;
  /** Start position in the input string */
  startPos: number;
  /** End position in the input string */
  endPos?: number;
  /** Partial value that was parsed (e.g., the reference name so far) */
  partialValue?: string;
}

/**
 * Result from tolerant parsing
 */
export interface TolerantParseResult {
  /** The parsed AST (may contain partial nodes if incomplete) */
  ast: ASTNode | null;
  /** Whether the input was complete or incomplete */
  state: ParseState;
  /** List of incomplete constructs found */
  incomplete: IncompleteInfo[];
  /** All tokens parsed (including partial tokens) */
  tokens: Token[];
  /** Error that occurred during parsing, if any slipped through tolerant mode */
  error?: Error;
}
