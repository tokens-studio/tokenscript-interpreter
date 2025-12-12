import {
  InterpreterError,
  LanguageError,
  LexerError,
  ParserError,
  ProcessorError,
} from "@src/interpreter/errors";
import { DependencyError } from "@src/processor";

export const errorClasses = {
  LanguageError,
  LexerError,
  ParserError,
  InterpreterError,
  ProcessorError,
  DependencyError,
};
