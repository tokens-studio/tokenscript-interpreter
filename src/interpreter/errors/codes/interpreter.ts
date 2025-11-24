export enum InterpreterErrorCode {
  // Visit errors
  UNKNOWN_NODE_TYPE = "INT_UNKNOWN_NODE_TYPE",

  // Binary operation errors
  ARITHMETIC_REQUIRES_NUMBER = "INT_ARITHMETIC_REQUIRES_NUMBER",
  UNKNOWN_BINARY_OPERATOR = "INT_UNKNOWN_BINARY_OPERATOR",

  // Unary operation errors
  UNARY_MINUS_NULL = "INT_UNARY_MINUS_NULL",
  UNARY_PLUS_NON_NUMBER = "INT_UNARY_PLUS_NON_NUMBER",
  UNARY_NOT_NON_BOOLEAN = "INT_UNARY_NOT_NON_BOOLEAN",
  UNKNOWN_UNARY_OPERATOR = "INT_UNKNOWN_UNARY_OPERATOR",

  // Reference errors
  UNKNOWN_REFERENCE = "INT_UNKNOWN_REFERENCE",
  UNKNOWN_FUNCTION = "INT_UNKNOWN_FUNCTION",

  // Variable errors
  INVALID_VARIABLE_NAME = "INT_INVALID_VARIABLE_NAME",
  VARIABLE_ALREADY_DEFINED = "INT_VARIABLE_ALREADY_DEFINED",
  INVALID_VARIABLE_TYPE = "INT_INVALID_VARIABLE_TYPE",
  INVALID_VALUE_FOR_VARIABLE = "INT_INVALID_VALUE_FOR_VARIABLE",
  VARIABLE_NOT_FOUND = "INT_VARIABLE_NOT_FOUND",
  ASSIGNMENT_VALUE_NULL = "INT_ASSIGNMENT_VALUE_NULL",
  TYPE_MISMATCH = "INT_TYPE_MISMATCH",
  CANNOT_ASSIGN_TYPE = "INT_CANNOT_ASSIGN_TYPE",

  // Attribute/method errors
  METHOD_RETURNED_NULL = "INT_METHOD_RETURNED_NULL",
  METHOD_NOT_FOUND = "INT_METHOD_NOT_FOUND",
  ATTRIBUTE_RETURNED_NULL = "INT_ATTRIBUTE_RETURNED_NULL",
  ATTRIBUTE_NOT_FOUND = "INT_ATTRIBUTE_NOT_FOUND",
  CANNOT_ACCESS_ATTRIBUTES = "INT_CANNOT_ACCESS_ATTRIBUTES",

  // Control flow errors
  MAX_ITERATIONS_EXCEEDED = "INT_MAX_ITERATIONS_EXCEEDED",
  WHILE_CONDITION_NOT_BOOLEAN = "INT_WHILE_CONDITION_NOT_BOOLEAN",
  IF_CONDITION_NOT_BOOLEAN = "INT_IF_CONDITION_NOT_BOOLEAN",

  // Unknown error
  UNKNOWN_ERROR = "INT_UNKNOWN_ERROR",
}

export interface InterpreterErrorData {
  [InterpreterErrorCode.UNKNOWN_NODE_TYPE]: {
    nodeType: string;
  };
  [InterpreterErrorCode.ARITHMETIC_REQUIRES_NUMBER]: {
    operator: string;
    leftType: string;
    rightType: string;
  };
  [InterpreterErrorCode.UNKNOWN_BINARY_OPERATOR]: {
    operator: string;
    tokenType: string;
  };
  [InterpreterErrorCode.UNARY_MINUS_NULL]: {
    symbolType: string;
  };
  [InterpreterErrorCode.UNARY_PLUS_NON_NUMBER]: {
    value: string;
  };
  [InterpreterErrorCode.UNARY_NOT_NON_BOOLEAN]: {
    value: string;
  };
  [InterpreterErrorCode.UNKNOWN_UNARY_OPERATOR]: {
    operator: string;
  };
  [InterpreterErrorCode.UNKNOWN_REFERENCE]: {
    reference: string;
  };
  [InterpreterErrorCode.UNKNOWN_FUNCTION]: {
    functionName: string;
  };
  [InterpreterErrorCode.INVALID_VARIABLE_NAME]: {
    name: string;
  };
  [InterpreterErrorCode.VARIABLE_ALREADY_DEFINED]: {
    name: string;
  };
  [InterpreterErrorCode.INVALID_VARIABLE_TYPE]: {
    typeName: string;
    validTypes: string;
  };
  [InterpreterErrorCode.INVALID_VALUE_FOR_VARIABLE]: {
    value: string;
    type: string;
    name: string;
  };
  [InterpreterErrorCode.VARIABLE_NOT_FOUND]: {
    name: string;
  };
  [InterpreterErrorCode.ASSIGNMENT_VALUE_NULL]: {
    identifier: string;
  };
  [InterpreterErrorCode.TYPE_MISMATCH]: {
    value: string;
    foundType: string;
    expectedType: string;
    identifier: string;
  };
  [InterpreterErrorCode.CANNOT_ASSIGN_TYPE]: {
    valueType: string;
    identifier: string;
    variableType: string;
  };
  [InterpreterErrorCode.METHOD_RETURNED_NULL]: {
    methodName: string;
  };
  [InterpreterErrorCode.METHOD_NOT_FOUND]: {
    methodName: string;
    value: string;
    type: string;
  };
  [InterpreterErrorCode.ATTRIBUTE_RETURNED_NULL]: {
    attributeName: string;
  };
  [InterpreterErrorCode.ATTRIBUTE_NOT_FOUND]: {
    attributeName: string;
    value: string;
    type: string;
  };
  [InterpreterErrorCode.CANNOT_ACCESS_ATTRIBUTES]: {
    type: string;
  };
  [InterpreterErrorCode.MAX_ITERATIONS_EXCEEDED]: Record<string, never>;
  [InterpreterErrorCode.WHILE_CONDITION_NOT_BOOLEAN]: Record<string, never>;
  [InterpreterErrorCode.IF_CONDITION_NOT_BOOLEAN]: Record<string, never>;
  [InterpreterErrorCode.UNKNOWN_ERROR]: Record<string, never>;
}
