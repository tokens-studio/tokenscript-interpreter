export enum SymbolsErrorCode {
  // Type errors
  VALUE_MUST_BE_TYPE = "SYM_VALUE_MUST_BE_TYPE",
  VALUE_IS_NULL = "SYM_VALUE_IS_NULL",

  // Method errors
  METHOD_NOT_FOUND = "SYM_METHOD_NOT_FOUND",
  MISSING_REQUIRED_ARGUMENT = "SYM_MISSING_REQUIRED_ARGUMENT",
  ATTRIBUTE_NOT_FOUND = "SYM_ATTRIBUTE_NOT_FOUND",
  CANNOT_SET_ATTRIBUTE = "SYM_CANNOT_SET_ATTRIBUTE",

  // Number errors
  INVALID_RADIX = "SYM_INVALID_RADIX",
  RADIX_CONVERSION_ERROR = "SYM_RADIX_CONVERSION_ERROR",

  // String errors
  CANNOT_CONCATENATE = "SYM_CANNOT_CONCATENATE",
  CANNOT_SPLIT = "SYM_CANNOT_SPLIT",

  // List errors
  INDEX_OUT_OF_RANGE = "SYM_INDEX_OUT_OF_RANGE",

  // Dictionary errors
  KEY_MUST_BE_STRING = "SYM_KEY_MUST_BE_STRING",

  // Token errors
  CANNOT_OPERATION_ON_TOKEN_TYPE = "SYM_CANNOT_OPERATION_ON_TOKEN_TYPE",

  // Color errors
  INVALID_HEX_COLOR = "SYM_INVALID_HEX_COLOR",
  COLOR_MANAGER_NOT_AVAILABLE = "SYM_COLOR_MANAGER_NOT_AVAILABLE",
  INVALID_COLOR_VALUE = "SYM_INVALID_COLOR_VALUE",
}

export interface SymbolsErrorData {
  [SymbolsErrorCode.VALUE_MUST_BE_TYPE]: {
    expectedType: string;
    actualType: string;
  };
  [SymbolsErrorCode.VALUE_IS_NULL]: {
    expectedType: string;
  };
  [SymbolsErrorCode.METHOD_NOT_FOUND]: {
    methodName: string;
    type: string;
  };
  [SymbolsErrorCode.MISSING_REQUIRED_ARGUMENT]: {
    argumentName: string;
    methodName: string;
  };
  [SymbolsErrorCode.ATTRIBUTE_NOT_FOUND]: {
    attributeName: string;
    type: string;
  };
  [SymbolsErrorCode.CANNOT_SET_ATTRIBUTE]: {
    attributeName: string;
    type: string;
  };
  [SymbolsErrorCode.INVALID_RADIX]: {
    radix: number;
  };
  [SymbolsErrorCode.RADIX_CONVERSION_ERROR]: {
    base: number;
    error: string;
  };
  [SymbolsErrorCode.CANNOT_CONCATENATE]: {
    type: string;
  };
  [SymbolsErrorCode.CANNOT_SPLIT]: {
    type: string;
  };
  [SymbolsErrorCode.INDEX_OUT_OF_RANGE]: {
    operation: string;
  };
  [SymbolsErrorCode.KEY_MUST_BE_STRING]: {
    type: string;
  };
  [SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE]: {
    operation: string;
    valueType: string;
  };
  [SymbolsErrorCode.INVALID_HEX_COLOR]: {
    value: string;
  };
  [SymbolsErrorCode.COLOR_MANAGER_NOT_AVAILABLE]: Record<string, never>;
  [SymbolsErrorCode.INVALID_COLOR_VALUE]: {
    value: string;
    type: string;
  };
}
