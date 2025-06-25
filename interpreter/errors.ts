
import { Token } from '../types';

export class LanguageError extends Error {
  public line?: number;
  public token?: Token;

  constructor(message: string, line?: number, token?: Token) {
    super(message);
    this.name = this.constructor.name;
    this.line = line;
    if (token && !line && token.line) {
      this.line = token.line;
    }
    this.token = token;
    this.message = this.formatMessage();
  }

  private formatMessage(): string {
    let base = this.message; // Original message passed to constructor
    if (this.line !== undefined) {
      base = `Line ${this.line}: ${base}`;
    }
    if (this.token && this.token.value !== undefined && this.token.value !== null) {
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
  constructor(message: string, line?: number, token?: Token) {
    super(message, line, token);
    this.name = "InterpreterError";
  }
}
