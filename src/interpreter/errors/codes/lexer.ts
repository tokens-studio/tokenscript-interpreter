export enum LexerErrorCode {
  INVALID_CHARACTER = "LEXER_INVALID_CHARACTER",
  UNTERMINATED_STRING = "LEXER_UNTERMINATED_STRING",
  UNTERMINATED_REFERENCE = "LEXER_UNTERMINATED_REFERENCE",
  EMPTY_VARIABLE_NAME = "LEXER_EMPTY_VARIABLE_NAME",
  INVALID_HEX_COLOR_FORMAT = "LEXER_INVALID_HEX_COLOR_FORMAT",
  EXPECTED_CHARACTER = "LEXER_EXPECTED_CHARACTER",
}

export interface LexerErrorData {
  [LexerErrorCode.INVALID_CHARACTER]: {
    char: string;
    position: number;
    description?: string;
  };
  [LexerErrorCode.UNTERMINATED_STRING]: {
    quoteType: string;
  };
  [LexerErrorCode.UNTERMINATED_REFERENCE]: Record<string, never>;
  [LexerErrorCode.EMPTY_VARIABLE_NAME]: Record<string, never>;
  [LexerErrorCode.INVALID_HEX_COLOR_FORMAT]: {
    value: string;
    expectedLength: string;
  };
  [LexerErrorCode.EXPECTED_CHARACTER]: {
    expected: string;
    got: string | null;
  };
}
