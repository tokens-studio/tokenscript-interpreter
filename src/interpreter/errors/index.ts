// Base error classes

export type { AllErrorCodes, ErrorOptions, InterpreterErrorCodes } from "./base";
export {
  InterpreterError,
  LanguageError,
  LexerError,
  ParserError,
  ProcessorError,
} from "./base";
export type {
  ColorErrorData,
  ConfigErrorData,
  FunctionsErrorData,
  InterpreterErrorData,
  LexerErrorData,
  OperationsErrorData,
  ParserErrorData,
  ProcessorErrorData,
  SymbolsErrorData,
  UnitErrorData,
} from "./codes";
// Error codes
export {
  ColorErrorCode,
  ConfigErrorCode,
  FunctionsErrorCode,
  InterpreterErrorCode,
  LexerErrorCode,
  OperationsErrorCode,
  ParserErrorCode,
  ProcessorErrorCode,
  SymbolsErrorCode,
  UnitErrorCode,
} from "./codes";

// Message system
export { getMessage, isValidErrorCode } from "./messages";
export type { SerializedError } from "./utils";
// Utilities
export {
  isInterpreterError,
  isLanguageError,
  isLexerError,
  isParserError,
  isProcessorError,
  serializeError,
} from "./utils";
