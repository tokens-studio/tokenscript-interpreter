export enum ParserErrorCode {
  UNEXPECTED_TOKEN = "PARSER_UNEXPECTED_TOKEN",
  EXPECTED_TOKEN_TYPE = "PARSER_EXPECTED_TOKEN_TYPE",
  UNEXPECTED_END = "PARSER_UNEXPECTED_END",
  CONDITION_MUST_BE_BOOLEAN = "PARSER_CONDITION_MUST_BE_BOOLEAN",
  INVALID_SYNTAX = "PARSER_INVALID_SYNTAX",
  TOLERANT_REQUIRES_INLINE = "PARSER_TOLERANT_REQUIRES_INLINE",
}

export interface ParserErrorData {
  [ParserErrorCode.UNEXPECTED_TOKEN]: {
    token: string;
  };
  [ParserErrorCode.EXPECTED_TOKEN_TYPE]: {
    expected: string;
    got: string;
  };
  [ParserErrorCode.CONDITION_MUST_BE_BOOLEAN]: Record<string, never>;
  [ParserErrorCode.INVALID_SYNTAX]: {
    message?: string;
  };
  [ParserErrorCode.UNEXPECTED_END]: Record<string, never>;
  [ParserErrorCode.TOLERANT_REQUIRES_INLINE]: Record<string, never>;
}
