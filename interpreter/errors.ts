import type { Token } from "../types";
import type { InterpreterErrorType } from "./error-types";

export class LanguageError extends Error {
  public line?: number;
  public token?: Token;
  public meta?: any;

  constructor(message: string, line?: number, token?: Token, meta?: any) {
    super(message);
    this.name = this.constructor.name;
    this.line = line;
    if (token && !line && token.line) {
      this.line = token.line;
    }
    this.token = token;
    this.message = this.formatMessage();
    this.meta = meta;
  }

  private formatMessage(): string {
    let base = this.message;
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
  constructor(message: string, line?: number, token?: Token) {
    super(message, line, token);
    this.name = "LexerError";
  }
}

export class ParserError extends LanguageError {
  constructor(message: string, line?: number, token?: Token) {
    super(message, line, token);
    this.name = "ParserError";
  }
}

export class InterpreterError extends LanguageError {
  public type?: InterpreterErrorType;

  constructor(
    message: string,
    line?: number,
    token?: Token,
    meta?: any,
    type?: InterpreterErrorType,
  ) {
    super(message, line, token, meta);
    this.name = "InterpreterError";
    this.type = type;
  }
}
