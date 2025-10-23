import { Operations, ReservedKeyword, SupportedFormats, type Token, TokenType } from "@src/types";
import { LexerError } from "./errors";
import { CodePoint, isAlpha, isAlphaNumeric, isNumber, isSpace } from "./utils/string";

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

  private error(description?: string): never {
    const char = this.currentChar === null ? "end of input" : this.currentChar;

    throw new LexerError(
      `Invalid character '${char}' at position ${this.pos}.${description ? ` ${description}` : ""}`,
      this.line,
      { type: TokenType.EOF, value: this.currentChar, line: this.line },
    );
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

  private eat(char: string): void {
    if (this.currentChar === char) {
      this.advance();
    } else {
      this.error(`Expected character ${char} got ${this.currentChar}`);
    }
  }

  private peek(n = 1): string | null {
    return this.text[this.pos + n];
  }

  private skipWhitespace(): void {
    while (isSpace(this.currentChar)) {
      this.advance();
    }
  }

  private skipLine(): void {
    while (this.currentChar !== null && this.currentChar !== "\n") {
      this.advance();
    }
    if (this.currentChar === "\n") {
      this.eat("\n");
    }
  }

  private isComment(): boolean {
    return this.currentChar === "/" && this.peek() === "/";
  }

  private number(): Token {
    let result = "";
    // Prepend 0 to digits like ".5"
    if (this.currentChar === ".") {
      result += "0";
    }

    while (isNumber(this.currentChar) || this.currentChar === ".") {
      result += this.currentChar;
      this.advance();
    }

    return { type: TokenType.NUMBER, value: result, line: this.line };
  }

  // Python like isdigit, that allows numbers starting with '.'
  private isDigit(): boolean {
    if (this.currentChar === null) return false;
    return isNumber(this.currentChar) || (this.currentChar === "." && isNumber(this.peek()));
  }

  private isValidIdentifierStart(char: string | null): boolean {
    if (char === null) return false;
    if (isAlpha(char)) return true;

    const cp = char.codePointAt(0) ?? 0;

    // Support emoji range
    if (cp <= 127) return false;

    // Disallowed Characters
    if (cp === CodePoint.FORWARD_TICK) return false;
    if (cp === CodePoint.BACKWARD_TICK) return false;

    return true;
  }

  private isValidStringElement(char: string | null): boolean {
    if (char === null) return false;
    const cp = char.codePointAt(0) ?? 0;
    return (
      isAlphaNumeric(char) || cp === CodePoint.HYPHEN || cp === CodePoint.UNDERSCORE || cp > 127 // Support emoji range
    );
  }

  private stringElement(): Token {
    let result = "";

    while (this.isValidStringElement(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }

    const normalizedResult = result.toLowerCase();

    const keyword = RESERVED_KEYWORD_STRINGS[normalizedResult];
    if (keyword) {
      return {
        type: TokenType.RESERVED_KEYWORD,
        value: keyword,
        line: this.line,
      };
    }

    const format = SUPPORTED_FORMAT_STRINGS[normalizedResult];
    if (format) {
      return {
        type: TokenType.FORMAT,
        value: format,
        line: this.line,
      };
    }

    return {
      type: TokenType.STRING,
      value: result,
      line: this.line,
    };
  }

  private reference(): Token {
    this.eat("{");

    let result = "";
    while (this.currentChar !== null && this.currentChar !== "}") {
      if (this.currentChar === "{") {
        this.error("Expected '}' to close variable.");
      }
      if (isSpace(this.currentChar)) {
        this.advance();
        continue;
      }
      result += this.currentChar;
      this.advance();
    }

    if (this.currentChar === null) {
      this.error("Unterminated reference, missing '}'.");
    }

    if (result === "") {
      this.error("Empty variable name.");
    }

    this.eat("}");
    return { type: TokenType.REFERENCE, value: result, line: this.line };
  }

  private explicitString(quoteType: string): Token {
    this.eat(quoteType);

    let result = "";
    while (this.currentChar !== null && this.currentChar !== quoteType) {
      result += this.currentChar;
      this.advance();
    }

    if (this.currentChar === null) {
      this.error(`Unterminated string, missing '${quoteType}'.`);
    }

    this.eat(quoteType);

    return { type: TokenType.EXPLICIT_STRING, value: result, line: this.line };
  }

  private hexColor(): Token {
    let result = "";
    while (isAlpha(this.currentChar) || this.isDigit() || this.currentChar === "#") {
      result += this.currentChar;
      this.advance();
    }
    if (result.length !== 4 && result.length !== 7) {
      this.error(`Invalid hex color format: ${result}. Length should be #RGB or #RRGGBB.`);
    }
    return { type: TokenType.HEX_COLOR, value: result, line: this.line };
  }

  public nextToken(): Token {
    while (this.currentChar !== null) {
      this.skipWhitespace();
      if (this.currentChar === null) break;

      if (this.isComment()) {
        this.skipLine();
        continue;
      }

      if (this.isDigit()) {
        return this.number();
      }

      if (this.currentChar === "'" || this.currentChar === '"') {
        return this.explicitString(this.currentChar);
      }

      if (this.isValidIdentifierStart(this.currentChar)) {
        return this.stringElement();
      }

      if (this.currentChar === "{") {
        return this.reference();
      }
      if (this.currentChar === "[") {
        this.eat("[");
        return { type: TokenType.LBLOCK, value: "[", line: this.line };
      }
      if (this.currentChar === "]") {
        this.eat("]");
        return { type: TokenType.RBLOCK, value: "]", line: this.line };
      }
      if (this.currentChar === "!" && this.peek() === "=") {
        this.eat("!");
        this.eat("=");
        return { type: TokenType.IS_NOT_EQ, value: "!=", line: this.line };
      }
      if (this.currentChar === "+") {
        this.eat("+");
        return {
          type: TokenType.OPERATION,
          value: Operations.ADD,
          line: this.line,
        };
      }
      if (this.currentChar === "-") {
        this.eat("-");
        return {
          type: TokenType.OPERATION,
          value: Operations.SUBTRACT,
          line: this.line,
        };
      }
      if (this.currentChar === "*") {
        this.eat("*");
        return {
          type: TokenType.OPERATION,
          value: Operations.MULTIPLY,
          line: this.line,
        };
      }
      if (this.currentChar === "/") {
        this.eat("/");
        return {
          type: TokenType.OPERATION,
          value: Operations.DIVIDE,
          line: this.line,
        };
      }
      if (this.currentChar === "^") {
        this.eat("^");
        return {
          type: TokenType.OPERATION,
          value: Operations.POWER,
          line: this.line,
        };
      }
      if (this.currentChar === "!") {
        this.eat("!");
        return {
          type: TokenType.OPERATION,
          value: Operations.LOGIC_NOT,
          line: this.line,
        };
      }
      if (this.currentChar === "(") {
        this.eat("(");
        return { type: TokenType.LPAREN, value: "(", line: this.line };
      }
      if (this.currentChar === ")") {
        this.eat(")");
        return { type: TokenType.RPAREN, value: ")", line: this.line };
      }
      if (this.currentChar === ",") {
        this.eat(",");
        return { type: TokenType.COMMA, value: ",", line: this.line };
      }
      if (this.currentChar === ".") {
        if (this.peek() !== null && isNumber(this.peek())) {
          return this.number();
        }
        this.eat(".");
        return { type: TokenType.DOT, value: ".", line: this.line };
      }
      if (this.currentChar === "#") {
        return this.hexColor();
      }
      if (this.currentChar === "%") {
        this.eat("%");
        return {
          type: TokenType.FORMAT,
          value: SupportedFormats.PERCENTAGE,
          line: this.line,
        };
      }
      if (this.currentChar === "=") {
        if (this.peek() === "=") {
          this.eat("=");
          this.eat("=");
          return { type: TokenType.IS_EQ, value: "==", line: this.line };
        }
        this.eat("=");
        return { type: TokenType.ASSIGN, value: "=", line: this.line };
      }
      if (this.currentChar === ">") {
        if (this.peek() === "=") {
          this.eat(">");
          this.eat("=");
          return { type: TokenType.IS_GT_EQ, value: ">=", line: this.line };
        }
        this.eat(">");
        return { type: TokenType.IS_GT, value: ">", line: this.line };
      }
      if (this.currentChar === "<") {
        if (this.peek() === "=") {
          this.eat("<");
          this.eat("=");
          return { type: TokenType.IS_LT_EQ, value: "<=", line: this.line };
        }
        this.eat("<");
        return { type: TokenType.IS_LT, value: "<", line: this.line };
      }
      if (this.currentChar === ";") {
        this.eat(";");
        return { type: TokenType.SEMICOLON, value: ";", line: this.line };
      }
      if (this.currentChar === "&" && this.peek() === "&") {
        this.eat("&");
        this.eat("&");
        return {
          type: TokenType.LOGIC_AND,
          value: Operations.LOGIC_AND,
          line: this.line,
        };
      }
      if (this.currentChar === "|" && this.peek() === "|") {
        this.eat("|");
        this.eat("|");
        return {
          type: TokenType.LOGIC_OR,
          value: Operations.LOGIC_OR,
          line: this.line,
        };
      }
      if (this.currentChar === ":") {
        this.eat(":");
        return { type: TokenType.COLON, value: ":", line: this.line };
      }

      // If we reach here, the character is not valid
      this.error();
    }
    return { type: TokenType.EOF, value: null, line: this.line };
  }

  peekToken(): Token | null {
    // Save current state
    const savedPos = this.pos;
    const savedChar = this.currentChar;
    const savedLine = this.line;
    const savedColumn = this.column;

    const nextToken = this.nextToken();

    // Restore state
    this.pos = savedPos;
    this.currentChar = savedChar;
    this.line = savedLine;
    this.column = savedColumn;

    return nextToken.type === TokenType.EOF ? null : nextToken;
  }

  peekTokens(n: number): Token[] | null {
    // Save current state
    const savedPos = this.pos;
    const savedChar = this.currentChar;
    const savedLine = this.line;
    const savedColumn = this.column;

    const tokens: Token[] = [];
    for (let i = 0; i < n; i++) {
      const token = this.nextToken();
      if (token.type === TokenType.EOF) {
        break;
      }
      tokens.push(token);
    }

    // Restore state
    this.pos = savedPos;
    this.currentChar = savedChar;
    this.line = savedLine;
    this.column = savedColumn;

    return tokens.length > 0 ? tokens : null;
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

  public getSourceInfo(): { text: string; pos: number; line: number; column: number } {
    return {
      text: this.text,
      pos: this.pos,
      line: this.line,
      column: this.column,
    };
  }
}
