export enum ProcessorErrorCode {
  TOKEN_NOT_FOUND = "PROC_TOKEN_NOT_FOUND",
  TOKEN_ALREADY_EXISTS = "PROC_TOKEN_ALREADY_EXISTS",
  CIRCULAR_DEPENDENCY = "PROC_CIRCULAR_DEPENDENCY",
  SUB_FIELD_NOT_RESOLVED = "PROC_SUB_FIELD_NOT_RESOLVED",
  DEPENDENCY_ERROR = "PROC_DEPENDENCY_ERROR",
  NO_THEMES_FOUND = "PROC_NO_THEMES_FOUND",
  THEME_NOT_FOUND = "PROC_THEME_NOT_FOUND",
  TOKEN_SET_NOT_FOUND = "PROC_TOKEN_SET_NOT_FOUND",
  TOKEN_SET_INVALID = "PROC_TOKEN_SET_INVALID",
  NO_SETS_TO_PROCESS = "PROC_NO_SETS_TO_PROCESS",
  MULTIPLE_SETS_NO_SELECTION = "PROC_MULTIPLE_SETS_NO_SELECTION",
  UNKNOWN_PARSING_ERROR = "PROC_UNKNOWN_PARSING_ERROR",
  RESOLVER_NOT_INITIALIZED = "PROC_RESOLVER_NOT_INITIALIZED",
}

export interface ProcessorErrorData {
  [ProcessorErrorCode.TOKEN_NOT_FOUND]: {
    tokenName: string;
  };
  [ProcessorErrorCode.TOKEN_ALREADY_EXISTS]: {
    tokenName: string;
  };
  [ProcessorErrorCode.CIRCULAR_DEPENDENCY]: {
    tokens: string | string[];
  };
  [ProcessorErrorCode.SUB_FIELD_NOT_RESOLVED]: {
    fieldPath: string;
  };
  [ProcessorErrorCode.DEPENDENCY_ERROR]: {
    tokenName: string;
    chain: string;
    rootCause: string;
  };
  [ProcessorErrorCode.NO_THEMES_FOUND]: {
    themeName: string;
  };
  [ProcessorErrorCode.THEME_NOT_FOUND]: {
    themeName: string;
    availableThemes: string[];
  };
  [ProcessorErrorCode.TOKEN_SET_NOT_FOUND]: {
    setName: string;
  };
  [ProcessorErrorCode.TOKEN_SET_INVALID]: {
    setName: string;
  };
  [ProcessorErrorCode.NO_SETS_TO_PROCESS]: Record<string, never>;
  [ProcessorErrorCode.MULTIPLE_SETS_NO_SELECTION]: {
    setNames: string[];
  };
  [ProcessorErrorCode.UNKNOWN_PARSING_ERROR]: {
    error?: string;
  };
  [ProcessorErrorCode.RESOLVER_NOT_INITIALIZED]: Record<string, never>;
}
