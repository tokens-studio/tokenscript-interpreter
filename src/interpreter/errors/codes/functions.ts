import type { SerializedError } from "../utils";

export enum FunctionsErrorCode {
  // Argument errors
  EXPECTS_NUMBER_ARGUMENTS = "FN_EXPECTS_NUMBER_ARGUMENTS",
  REQUIRES_MIN_ARGUMENTS = "FN_REQUIRES_MIN_ARGUMENTS",
  EXPECTS_TYPE_ARGUMENT = "FN_EXPECTS_TYPE_ARGUMENT",

  // Math errors
  DIVISION_BY_ZERO = "FN_DIVISION_BY_ZERO",
  ARGUMENT_OUT_OF_RANGE = "FN_ARGUMENT_OUT_OF_RANGE",
  INVALID_BASE = "FN_INVALID_BASE",
  PARSE_ERROR = "FN_PARSE_ERROR",

  // Unit errors
  UNIT_CONVERSION_FAILED = "FN_UNIT_CONVERSION_FAILED",

  // Dynamic function errors
  NO_CONFIG_AVAILABLE = "FN_NO_CONFIG_AVAILABLE",
  FUNCTION_RETURNED_NULL = "FN_FUNCTION_RETURNED_NULL",
  EXECUTION_ERROR = "FN_EXECUTION_ERROR",
}

export interface FunctionsErrorData {
  [FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS]: {
    functionName: string;
  };
  [FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS]: {
    functionName: string;
    minArgs: number;
  };
  [FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT]: {
    functionName: string;
    expectedType: string;
    argumentPosition: string;
  };
  [FunctionsErrorCode.DIVISION_BY_ZERO]: {
    functionName: string;
  };
  [FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE]: {
    functionName: string;
    constraint: string;
  };
  [FunctionsErrorCode.INVALID_BASE]: {
    functionName: string;
    constraint: string;
  };
  [FunctionsErrorCode.PARSE_ERROR]: {
    functionName: string;
    value: string;
    base: number;
  };
  [FunctionsErrorCode.UNIT_CONVERSION_FAILED]: {
    functionName: string;
    error: SerializedError;
  };
  [FunctionsErrorCode.NO_CONFIG_AVAILABLE]: {
    functionName: string;
  };
  [FunctionsErrorCode.FUNCTION_RETURNED_NULL]: {
    functionName: string;
  };
  [FunctionsErrorCode.EXECUTION_ERROR]: {
    functionName: string;
    error: SerializedError;
  };
}
