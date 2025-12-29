import type { SerializedError } from "../utils";

export enum ColorErrorCode {
  // Initializer errors
  INITIALIZER_CRASHED = "COLOR_INITIALIZER_CRASHED",
  INITIALIZER_CONSTRUCT_FAILED = "COLOR_INITIALIZER_CONSTRUCT_FAILED",
  INITIALIZER_NOT_FOUND = "COLOR_INITIALIZER_NOT_FOUND",

  // Conversion errors
  CONVERSION_TARGET_NOT_FOUND = "COLOR_CONVERSION_TARGET_NOT_FOUND",
  SOURCE_URI_NOT_FOUND = "COLOR_SOURCE_URI_NOT_FOUND",
  TARGET_URI_NOT_FOUND = "COLOR_TARGET_URI_NOT_FOUND",
  CONVERSION_ERROR = "COLOR_CONVERSION_ERROR",

  // Attribute errors
  STRING_VALUE_ASSIGNMENT = "COLOR_STRING_VALUE_ASSIGNMENT",
  ATTRIBUTE_CHAIN_TOO_LONG = "COLOR_ATTRIBUTE_CHAIN_TOO_LONG",

  // Specification errors
  MISSING_SPEC = "COLOR_MISSING_SPEC",
  MISSING_SCHEMA = "COLOR_MISSING_SCHEMA",
  MISSING_ATTRIBUTE_SCHEMA = "COLOR_MISSING_ATTRIBUTE_SCHEMA",

  // Type errors
  INVALID_ATTRIBUTE_TYPE = "COLOR_INVALID_ATTRIBUTE_TYPE",

  // Alpha errors
  INVALID_ALPHA_VALUE = "COLOR_INVALID_ALPHA_VALUE",
}

export interface ColorErrorData {
  [ColorErrorCode.INITIALIZER_CRASHED]: Record<string, never>;
  [ColorErrorCode.INITIALIZER_CONSTRUCT_FAILED]: {
    error: SerializedError;
  };
  [ColorErrorCode.INITIALIZER_NOT_FOUND]: {
    keyword: string;
  };
  [ColorErrorCode.CONVERSION_TARGET_NOT_FOUND]: {
    targetUri: string;
  };
  [ColorErrorCode.SOURCE_URI_NOT_FOUND]: {
    colorType: string;
  };
  [ColorErrorCode.TARGET_URI_NOT_FOUND]: {
    colorType: string;
  };
  [ColorErrorCode.CONVERSION_ERROR]: {
    message: string;
  };
  [ColorErrorCode.STRING_VALUE_ASSIGNMENT]: {
    attributes: string;
    identifier: string;
    colorType: string;
  };
  [ColorErrorCode.ATTRIBUTE_CHAIN_TOO_LONG]: {
    attributes: string;
    identifier: string;
    colorType: string;
  };
  [ColorErrorCode.MISSING_SPEC]: {
    identifier: string;
    colorType: string;
  };
  [ColorErrorCode.MISSING_SCHEMA]: {
    colorType: string;
  };
  [ColorErrorCode.MISSING_ATTRIBUTE_SCHEMA]: {
    attribute: string;
    identifier: string;
    colorType: string;
  };
  [ColorErrorCode.INVALID_ATTRIBUTE_TYPE]: {
    attributeType: string;
    validTypes: string;
  };
  [ColorErrorCode.INVALID_ALPHA_VALUE]: {
    alpha: number;
  };
}
