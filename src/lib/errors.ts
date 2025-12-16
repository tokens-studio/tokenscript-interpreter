import {
  InterpreterError,
  LanguageError,
  LexerError,
  ParserError,
  ProcessorError,
} from "@src/interpreter/errors";
import { createDependencyError } from "@src/processor";

export const errorClasses = {
  LanguageError,
  LexerError,
  ParserError,
  InterpreterError,
  ProcessorError,
};

export const errorHelpers = {
  createDependencyError,
};
