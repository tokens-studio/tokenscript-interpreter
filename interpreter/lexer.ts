import { Operations, ReservedKeyword, SupportedFormats, type Token, TokenType } from "../types";
import { LexerError } from "./errors";

// Correctly map lowercase string to enum member (which is also the lowercase string for these string enums)
const SUPPORTED_FORMAT_STRINGS: Record<string, SupportedFormats> = {};
for (const val of Object.values(SupportedFormats) as string[]) {
  SUPPORTED_FORMAT_STRINGS[val.toLowerCase()] = val as SupportedFormats;
}

const RESERVED_KEYWORD_STRINGS: Record<string, ReservedKeyword> = {};
for (const val of Object.values(ReservedKeyword) as string[]) {
  RESERVED_KEYWORD_STRINGS[val.toLowerCase()] = val as ReservedKeyword;
}

export class Lexer {
  private text: string;
  private currentChar: string | null;
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(text: string) {
    this.text = text;
    this.currentChar = this.text[this.pos];
  }

  private advance(): void {
    if (this.currentChar === "\n") {
      this.line++;
      this.column = 0;
    }
    this.pos++;
    this.column++;
    this.currentChar = this.pos < this.text.length ? this.text[this.pos] : null;
  }

  private peek(n = 1): string | null {
    const peekPos = this.pos + n;
    return peekPos < this.text.length ? this.text[peekPos] : null;
  }

  private skipWhitespace(): void {
    while (this.currentChar !== null && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  private skipLine(): void {
    while (this.currentChar !== null && this.currentChar !== "\n") {
      this.advance();
    }
    if (this.currentChar === "\n") this.advance(); // consume newline
  }

  private number(): Token {
    let result = "";
    let hasDecimal = false;
    if (this.currentChar === ".") {
      // Handle numbers like .5
      result += "0"; // Prepend 0
    }

    while (
      this.currentChar !== null &&
      (/\d/.test(this.currentChar) || (!hasDecimal && this.currentChar === "."))
    ) {
      if (this.currentChar === ".") {
        if (hasDecimal) break; // Only one decimal point allowed
        hasDecimal = true;
      }
      result += this.currentChar;
      this.advance();
    }
    // If result starts with "0." but is just "0", correct it.
    if (result === "0" && this.currentChar !== "." && !hasDecimal) {
      // This is just an integer 0
    } else if (
      result.startsWith("0") &&
      result !== "0" &&
      !result.startsWith("0.") &&
      result.length > 1
    ) {
      // Invalid number like "0123" if not followed by decimal
      // This case is complex, for now, we assume valid numbers or let parser handle it
    }
    return { type: TokenType.NUMBER, value: result, line: this.line };
  }

  private isAlpha(char: string | null): boolean {
    // Check if character is a letter (a-z, A-Z) or underscore
    if (char === null) return false;
    const cp = char.codePointAt(0) ?? 0;
    return (
      (cp >= 65 && cp <= 90) || // A-Z
      (cp >= 97 && cp <= 122) || // a-z
      cp === 95
    ); // underscore (_)
  }

  private isDigit(char: string | null): boolean {
    if (char === null) return false;
    const cp = char.codePointAt(0) ?? 0;
    return cp >= 48 && cp <= 57; // 0-9
  }

  private isAlphaNumeric(char: string | null): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isValidIdentifierStart(char: string | null): boolean {
    if (char === null) return false;
    if (this.isAlpha(char)) return true;

    const cp = char.codePointAt(0) ?? 0;
    // Emoji Support
    if (cp <= 127) return false;

    if (cp === 180) return false; // Forwardtick
    if (cp === 96) return false; // BackwardTick

    return true;
  }

  private isValidIdentifierPart(char: string | null): boolean {
    if (char === null) return false;
    const cp = char.codePointAt(0) ?? 0;
    return this.isAlphaNumeric(char) || cp === 45 /* hyphen */ || cp > 127;
  }

  private identifierOrKeyword(): Token {
    let result = "";

    // First character validation
    if (!this.isValidIdentifierStart(this.currentChar)) {
      throw new LexerError(
        `Invalid identifier starting character: '${this.currentChar}'`,
        this.line
      );
    }

    // Add first character
    if (this.currentChar !== null) {
      result += this.currentChar;
      this.advance();
    }

    // Then continue with all valid chars
    while (this.currentChar !== null && this.isValidIdentifierPart(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }

    const lowerResult = result.toLowerCase();
    if (RESERVED_KEYWORD_STRINGS[lowerResult]) {
      return {
        type: TokenType.RESERVED_KEYWORD,
        value: RESERVED_KEYWORD_STRINGS[lowerResult],
        line: this.line,
      };
    }
    if (SUPPORTED_FORMAT_STRINGS[lowerResult]) {
      return {
        type: TokenType.FORMAT,
        value: SUPPORTED_FORMAT_STRINGS[lowerResult],
        line: this.line,
      };
    }
    return { type: TokenType.STRING, value: result, line: this.line }; // Includes function names, variable names
  }

  private reference(): Token {
    // Handles {reference.name}
    this.advance(); // Skip '{'
    let result = "";
    while (this.currentChar !== null && this.currentChar !== "}") {
      if (this.currentChar === "{")
        throw new LexerError("Nested '{' in reference not allowed.", this.line);
      result += this.currentChar;
      this.advance();
    }
    if (this.currentChar === null)
      throw new LexerError("Unterminated reference, missing '}'.", this.line);
    this.advance(); // Skip '}'
    return { type: TokenType.REFERENCE, value: result.trim(), line: this.line };
  }

  private explicitString(quoteType: string): Token {
    this.advance(); // Skip opening quote
    let result = "";
    while (this.currentChar !== null && this.currentChar !== quoteType) {
      result += this.currentChar;
      this.advance();
    }
    if (this.currentChar === null)
      throw new LexerError(`Unterminated string, missing '${quoteType}'.`, this.line);
    this.advance(); // Skip closing quote
    return { type: TokenType.EXPLICIT_STRING, value: result, line: this.line };
  }

  private hexColor(): Token {
    let result = "#";
    this.advance(); // Skip '#'
    while (this.currentChar !== null && /[0-9a-fA-F]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
      if (result.length > 7) break; // Max #RRGGBB or #RGB
    }
    // After loop, this.currentChar is the first char NOT part of hex.
    // Check if what we gathered is valid length
    if (result.length !== 4 && result.length !== 7) {
      // #RGB or #RRGGBB
      throw new LexerError(
        `Invalid hex color format: ${result}. Length should be #RGB or #RRGGBB.`,
        this.line
      );
    }
    return { type: TokenType.HEX_COLOR, value: result, line: this.line };
  }

  public nextToken(): Token {
    while (this.currentChar !== null) {
      this.skipWhitespace();
      if (this.currentChar === null) break;

      // Skip comment
      if (this.currentChar === "/" && this.peek() === "/") {
        this.advance();
        this.advance();
        this.skipLine();
        continue;
      }

      if (this.isValidIdentifierStart(this.currentChar)) {
        return this.identifierOrKeyword();
      }

      if (
        this.isDigit(this.currentChar) ||
        (this.currentChar === "." && this.isDigit(this.peek()))
      ) {
        return this.number();
      }
      if (this.currentChar === "{") {
        return this.reference();
      }
      if (this.currentChar === "'" || this.currentChar === '"') {
        return this.explicitString(this.currentChar);
      }
      if (this.currentChar === "#") {
        return this.hexColor();
      }

      let token: Token | null = null;
      switch (this.currentChar) {
        case "+":
          token = { type: TokenType.OPERATION, value: Operations.ADD, line: this.line };
          break;
        case "-":
          token = { type: TokenType.OPERATION, value: Operations.SUBTRACT, line: this.line };
          break;
        case "*":
          token = { type: TokenType.OPERATION, value: Operations.MULTIPLY, line: this.line };
          break;
        case "/":
          if (this.peek() !== "/") {
            // Avoid confusion with comments
            token = { type: TokenType.OPERATION, value: Operations.DIVIDE, line: this.line };
          } // else it's a comment, handled above
          break;
        case "^":
          token = { type: TokenType.OPERATION, value: Operations.POWER, line: this.line };
          break;
        case "(":
          token = { type: TokenType.LPAREN, value: "(", line: this.line };
          break;
        case ")":
          token = { type: TokenType.RPAREN, value: ")", line: this.line };
          break;
        case ",":
          token = { type: TokenType.COMMA, value: ",", line: this.line };
          break;
        case ";":
          token = { type: TokenType.SEMICOLON, value: ";", line: this.line };
          break;
        case ":":
          token = { type: TokenType.COLON, value: ":", line: this.line };
          break;
        case ".":
          token = { type: TokenType.DOT, value: ".", line: this.line };
          break;
        case "[":
          token = { type: TokenType.LBLOCK, value: "[", line: this.line };
          break;
        case "]":
          token = { type: TokenType.RBLOCK, value: "]", line: this.line };
          break;
        case "%":
          token = { type: TokenType.FORMAT, value: SupportedFormats.PERCENTAGE, line: this.line };
          break;
        case "=":
          if (this.peek() === "=") {
            this.advance();
            token = { type: TokenType.IS_EQ, value: "==", line: this.line };
          } else {
            token = { type: TokenType.ASSIGN, value: "=", line: this.line };
          }
          break;
        case "!":
          if (this.peek() === "=") {
            this.advance();
            token = { type: TokenType.IS_NOT_EQ, value: "!=", line: this.line };
          } else {
            token = { type: TokenType.OPERATION, value: Operations.LOGIC_NOT, line: this.line };
          }
          break;
        case ">":
          if (this.peek() === "=") {
            this.advance();
            token = { type: TokenType.IS_GT_EQ, value: ">=", line: this.line };
          } else {
            token = { type: TokenType.IS_GT, value: ">", line: this.line };
          }
          break;
        case "<":
          if (this.peek() === "=") {
            this.advance();
            token = { type: TokenType.IS_LT_EQ, value: "<=", line: this.line };
          } else {
            token = { type: TokenType.IS_LT, value: "<", line: this.line };
          }
          break;
        case "&":
          if (this.peek() === "&") {
            this.advance();
            token = { type: TokenType.LOGIC_AND, value: Operations.LOGIC_AND, line: this.line };
          } else {
            throw new LexerError(
              `Unexpected character: ${this.currentChar} without a following '&'`,
              this.line
            );
          }
          break;
        case "|":
          if (this.peek() === "|") {
            this.advance();
            token = { type: TokenType.LOGIC_OR, value: Operations.LOGIC_OR, line: this.line };
          } else {
            throw new LexerError(
              `Unexpected character: ${this.currentChar} without a following '|'`,
              this.line
            );
          }
          break;
      }

      if (token) {
        this.advance();
        return token;
      }

      if (this.currentChar === null) break; // End of processing after whitespace
      throw new LexerError(`Invalid character '${this.currentChar}'`, this.line);
    }
    return { type: TokenType.EOF, value: null, line: this.line };
  }

  peekNextToken(): Token | null {
    // Save current state
    const savedPos = this.pos;
    const savedChar = this.currentChar;
    const savedLine = this.line;
    const savedColumn = this.column;

    // Get next token
    const nextToken = this.nextToken();

    // Restore state
    this.pos = savedPos;
    this.currentChar = savedChar;
    this.line = savedLine;
    this.column = savedColumn;

    return nextToken.type === TokenType.EOF ? null : nextToken;
  }

  public isEOF(): boolean {
    // Check if we're at the end of input or only have whitespace remaining
    let tempPos = this.pos;
    let tempChar = this.currentChar;

    // Skip whitespace
    while (tempChar !== null && /\s/.test(tempChar)) {
      tempPos++;
      tempChar = tempPos < this.text.length ? this.text[tempPos] : null;
    }

    return tempChar === null;
  }
}
