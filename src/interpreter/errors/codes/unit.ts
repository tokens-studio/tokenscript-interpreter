import type { SerializedError } from "../utils";

export enum UnitErrorCode {
  // Conversion errors
  CONVERSION_CRASHED = "UNIT_CONVERSION_CRASHED",
  SOURCE_URI_NOT_FOUND = "UNIT_SOURCE_URI_NOT_FOUND",
  RELATIVE_REQUIRES_TWO_NUMBERS = "UNIT_RELATIVE_REQUIRES_TWO_NUMBERS",
  NO_TO_ABSOLUTE_SCRIPT = "UNIT_NO_TO_ABSOLUTE_SCRIPT",
  TO_ABSOLUTE_MUST_RETURN_NUMBER = "UNIT_TO_ABSOLUTE_MUST_RETURN_NUMBER",
  CANNOT_CONVERT_MULTIPLE_RELATIVE = "UNIT_CANNOT_CONVERT_MULTIPLE_RELATIVE",
  NO_VALID_CONVERSION_PATH = "UNIT_NO_VALID_CONVERSION_PATH",
}

export interface UnitErrorData {
  [UnitErrorCode.CONVERSION_CRASHED]: {
    error: SerializedError;
  };
  [UnitErrorCode.SOURCE_URI_NOT_FOUND]: {
    unit: string;
  };
  [UnitErrorCode.RELATIVE_REQUIRES_TWO_NUMBERS]: Record<string, never>;
  [UnitErrorCode.NO_TO_ABSOLUTE_SCRIPT]: {
    unit: string;
  };
  [UnitErrorCode.TO_ABSOLUTE_MUST_RETURN_NUMBER]: Record<string, never>;
  [UnitErrorCode.CANNOT_CONVERT_MULTIPLE_RELATIVE]: Record<string, never>;
  [UnitErrorCode.NO_VALID_CONVERSION_PATH]: Record<string, never>;
}
