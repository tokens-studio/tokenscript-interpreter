import { InterpreterError, LanguageError, LexerError, ParserError, ProcessorError } from "./base";

/**
 * Union type for serialized error data that can be passed in error data objects.
 * Used when wrapping errors from catch blocks.
 */
export type SerializedError = Error | LanguageError | string | { message: string; stack?: string };

export function isLanguageError(error: unknown): error is LanguageError {
  return error instanceof LanguageError;
}

export function isLexerError(error: unknown): error is LexerError {
  return error instanceof LexerError;
}

export function isParserError(error: unknown): error is ParserError {
  return error instanceof ParserError;
}

export function isInterpreterError(error: unknown): error is InterpreterError {
  return error instanceof InterpreterError;
}

export function isProcessorError(error: unknown): error is ProcessorError {
  return error instanceof ProcessorError;
}

/**
 * Serializes an error into a structured format suitable for error data.
 * Preserves error information while ensuring it's serializable.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof LanguageError) {
    return error;
  }
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return error as { message: string; stack?: string };
  }
  return String(error);
}
