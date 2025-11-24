import type { Token } from "@src/types";
import type { ColorErrorCode } from "./codes/color";
import type { ConfigErrorCode } from "./codes/config";
import type { FunctionsErrorCode } from "./codes/functions";
import type { InterpreterErrorCode } from "./codes/interpreter";
import type { LexerErrorCode } from "./codes/lexer";
import type { OperationsErrorCode } from "./codes/operations";
import type { ParserErrorCode } from "./codes/parser";
import type { ProcessorErrorCode } from "./codes/processor";
import type { SymbolsErrorCode } from "./codes/symbols";
import type { UnitErrorCode } from "./codes/unit";
import { getMessage } from "./messages";

export interface ErrorOptions {
  token?: Token;
  line?: number;
  data?: Record<string, unknown>;
  cause?: unknown;
}

export type AllErrorCodes =
  | LexerErrorCode
  | ParserErrorCode
  | InterpreterErrorCode
  | OperationsErrorCode
  | SymbolsErrorCode
  | FunctionsErrorCode
  | ConfigErrorCode
  | ProcessorErrorCode
  | ColorErrorCode
  | UnitErrorCode;

export type InterpreterErrorCodes =
  | InterpreterErrorCode
  | OperationsErrorCode
  | SymbolsErrorCode
  | FunctionsErrorCode
  | ConfigErrorCode
  | ColorErrorCode
  | UnitErrorCode;

export class LanguageError extends Error {
  public readonly code: string;
  public readonly data: Record<string, unknown>;
  public readonly line?: number;
  public readonly token?: Token;
  public readonly originalMessage: string;

  constructor(code: string, options?: ErrorOptions) {
    const message = getMessage(code, options?.data);
    super(message, options?.cause ? { cause: options.cause } : undefined);

    this.name = this.constructor.name;
    this.code = code;
    this.data = options?.data || {};
    this.token = options?.token;

    // Derive line from token if not explicitly provided
    this.line = options?.line ?? options?.token?.line;

    this.originalMessage = message;
    this.message = this.formatMessage();
  }

  private formatMessage(): string {
    let base = this.originalMessage;
    if (this.line !== undefined) {
      base = `Line ${this.line}: ${base}`;
    }
    if (this.token?.value) {
      base += `\nNear token: ${String(this.token.value)}`;
    }
    return base;
  }
}

export class LexerError extends LanguageError {
  public readonly code: LexerErrorCode;

  constructor(code: LexerErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "LexerError";
    this.code = code;
  }
}

export class ParserError extends LanguageError {
  public readonly code: ParserErrorCode;

  constructor(code: ParserErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "ParserError";
    this.code = code;
  }
}

export class InterpreterError extends LanguageError {
  public readonly code: InterpreterErrorCodes;

  constructor(code: InterpreterErrorCodes, options?: ErrorOptions) {
    super(code, options);
    this.name = "InterpreterError";
    this.code = code;
  }
}

export class ProcessorError extends LanguageError {
  public readonly code: ProcessorErrorCode;

  constructor(code: ProcessorErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "ProcessorError";
    this.code = code;
  }
}
