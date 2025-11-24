export enum OperationsErrorCode {
  UNSUPPORTED_OPERAND_TYPE = "OP_UNSUPPORTED_OPERAND_TYPE",
  CANNOT_MIX_UNITS = "OP_CANNOT_MIX_UNITS",
  INCOMPATIBLE_TYPES = "OP_INCOMPATIBLE_TYPES",
  CANNOT_COMPARE_UNITS = "OP_CANNOT_COMPARE_UNITS",
  ORDERING_WITH_NULL = "OP_ORDERING_WITH_NULL",
  LOGICAL_REQUIRES_BOOLEAN = "OP_LOGICAL_REQUIRES_BOOLEAN",
  DIVISION_BY_ZERO = "OP_DIVISION_BY_ZERO",
  UNIT_EXPONENT_NOT_SUPPORTED = "OP_UNIT_EXPONENT_NOT_SUPPORTED",
}

export interface OperationsErrorData {
  [OperationsErrorCode.UNSUPPORTED_OPERAND_TYPE]: {
    type: string;
  };
  [OperationsErrorCode.CANNOT_MIX_UNITS]: {
    units: string;
  };
  [OperationsErrorCode.INCOMPATIBLE_TYPES]: {
    typeA: string;
    typeB: string;
  };
  [OperationsErrorCode.CANNOT_COMPARE_UNITS]: {
    unitA: string;
    unitB: string;
  };
  [OperationsErrorCode.ORDERING_WITH_NULL]: Record<string, never>;
  [OperationsErrorCode.LOGICAL_REQUIRES_BOOLEAN]: {
    operator: string;
  };
  [OperationsErrorCode.DIVISION_BY_ZERO]: Record<string, never>;
  [OperationsErrorCode.UNIT_EXPONENT_NOT_SUPPORTED]: {
    unitA: string;
    unitB: string;
  };
}
