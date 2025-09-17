// Color Manager specific error types

export enum ColorAttributeError {
  STRING_VALUE_ASSIGNMENT = "STRING_VALUE_ASSIGNMENT",
  ATTRIBUTE_CHAIN_TOO_LONG = "ATTRIBUTE_CHAIN_TOO_LONG",
}

export enum ColorSpecificationError {
  MISSING_SPEC = "MISSING_SPEC",
  MISSING_SCHEMA = "MISSING_SCHEMA",
}

export enum ColorTypeError {
  INVALID_ATTRIBUTE_TYPE = "INVALID_ATTRIBUTE_TYPE",
}

// Combined ColorManager error types
export enum ColorManagerError {
  // Attribute errors
  STRING_VALUE_ASSIGNMENT = "STRING_VALUE_ASSIGNMENT",
  ATTRIBUTE_CHAIN_TOO_LONG = "ATTRIBUTE_CHAIN_TOO_LONG",

  // Specification errors
  MISSING_SPEC = "MISSING_SPEC",
  MISSING_SCHEMA = "MISSING_SCHEMA",

  // Type errors
  INVALID_ATTRIBUTE_TYPE = "INVALID_ATTRIBUTE_TYPE",
}

// Type union for all possible ColorManager error types
export type ColorManagerErrorType =
  | ColorManagerError.STRING_VALUE_ASSIGNMENT
  | ColorManagerError.ATTRIBUTE_CHAIN_TOO_LONG
  | ColorManagerError.MISSING_SPEC
  | ColorManagerError.MISSING_SCHEMA
  | ColorManagerError.INVALID_ATTRIBUTE_TYPE;
