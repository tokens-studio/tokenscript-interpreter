import type { Token } from "../types.js";

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

// Utilities -------------------------------------------------------------------

const errorTemplate = (msg: string) => `TokenScript Error: ${msg}`;

// Token Resolution Errors ----------------------------------------------------

export class TokenResolutionError extends Error {
  data: {
    tokenName: string;
    originalValue: string;
    errorType: 'missing_reference' | 'circular_dependency' | 'interpretation_error' | 'syntax_error';
    details?: string;
    references?: string[];
  };

  constructor({
    tokenName,
    originalValue,
    errorType,
    details,
    references,
  }: {
    tokenName: string;
    originalValue: string;
    errorType: 'missing_reference' | 'circular_dependency' | 'interpretation_error' | 'syntax_error';
    details?: string;
    references?: string[];
  }) {
    let errorMessage: string;

    switch (errorType) {
      case 'missing_reference':
        errorMessage = `Token '${tokenName}' references missing tokens: ${references?.join(', ') || 'unknown'}`;
        break;
      case 'circular_dependency':
        errorMessage = `Token '${tokenName}' has circular dependency in reference chain: ${references?.join(' → ') || 'unknown'}`;
        break;
      case 'interpretation_error':
        errorMessage = `Token '${tokenName}' failed to interpret: ${details || 'unknown error'}`;
        break;
      case 'syntax_error':
        errorMessage = `Token '${tokenName}' has syntax error: ${details || 'invalid syntax'}`;
        break;
      default:
        errorMessage = `Token '${tokenName}' could not be resolved`;
    }

    super(errorTemplate(errorMessage));
    this.data = {
      tokenName,
      originalValue,
      errorType,
      details,
      references,
    };
  }
}
