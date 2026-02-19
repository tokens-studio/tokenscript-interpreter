import { Operations, ReservedKeyword, SupportedFormats, type Token, TokenType } from "@src/types";
import { LexerError, LexerErrorCode } from "./errors";
import { CodePoint, isAlpha, isAlphaNumeric, isNumber, isSpace } from "./utils/string";

const SUPPORTED_FORMAT_STRINGS: Record<string, SupportedFormats> = {};
for (const val of Object.values(SupportedFormats) as string[]) {
  SUPPORTED_FORMAT_STRINGS[val.toLowerCase()] = val as SupportedFormats;
}

const RESERVED_KEYWORD_STRINGS: Record<string, ReservedKeyword> = {};
for (const val of Object.values(ReservedKeyword) as string[]) {
  RESERVED_KEYWORD_STRINGS[val.toLowerCase()] = val as ReservedKeyword;
}

/**
 * Options for the Lexer
 */
export interface LexerOptions {
  /**
   * If true, the lexer will not throw errors on incomplete input.
   * Instead, it will return partial tokens where appropriate.
   */
  tolerant?: boolean;
}

export class Lexer {
  private text: string;
  private currentChar: string | null;
  private pos = 0;
  private line = 1;
  private column = 1;
  /**
   * Track the last NUMBER, RPAREN, or REFERENCE token for FORMAT adjacency detection.
   * FORMAT tokens (units like 'px', 's', 'ms') are only valid when immediately adjacent
   * to these tokens (no whitespace). This prevents conflicts where unit keywords
   * could be confused with identifiers (e.g., 's' for saturation vs seconds).
   *
   * @see docs/tokenscript/edge-cases/format-unit-parsing.md
   */
  private _lastUnitableToken: Token | null = null;
  private tolerant: boolean;
  private collectedTokens: Token[] = [];

  constructor(text: string, options?: LexerOptions) {
    this.text = text;
    this.currentChar = this.pos < this.text.length ? this.text[this.pos] : null;
    this.tolerant = options?.tolerant ?? false;
  }

  /**
   * Check if a FORMAT token (unit suffix) is valid at the given position.
   * FORMAT is only valid when immediately adjacent to a NUMBER or RPAREN.
   * e.g., '3s' (number with unit), '(3px + 4px)rem' (unit conversion)
   */
  private isValidFormatPosition(startPos: number): boolean {
    return this._lastUnitableToken !== null && this._lastUnitableToken.endPos === startPos;
  }

  private error(code: LexerErrorCode, data?: Record<string, unknown>): never {
    throw new LexerError(code, {
      line: this.line,
      data,
    });
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
      this.error(LexerErrorCode.EXPECTED_CHARACTER, {
        expected: char,
        got: this.currentChar,
      });
    }
  }

  private peek(n = 1): string | null {
    return this.text[this.pos + n] ?? null;
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
    const startPos = this.pos;
    let result = "";
    let hasDecimalPoint = false;

    // Prepend 0 to digits like ".5"
    if (this.currentChar === ".") {
      result += "0";
    }

    while (isNumber(this.currentChar) || this.currentChar === ".") {
      // Only allow one decimal point per number
      if (this.currentChar === ".") {
        if (hasDecimalPoint) {
          this.error(LexerErrorCode.MULTIPLE_DECIMAL_POINTS, {
            value: result + this.currentChar,
          });
        }
        hasDecimalPoint = true;
      }
      result += this.currentChar;
      this.advance();
    }

    const token: Token = {
      type: TokenType.NUMBER,
      value: result,
      line: this.line,
      pos: startPos,
      endPos: this.pos,
    };
    // Track for FORMAT adjacency detection (e.g., '3s', '3.5ms')
    this._lastUnitableToken = token;
    return token;
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
    const startPos = this.pos;
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
        pos: startPos,
        endPos: this.pos,
      };
    }

    // FORMAT tokens (units like 'px', 's', 'ms') are only valid immediately after NUMBER or RPAREN
    // e.g., '3s' (number with unit), '(3px + 4px)rem' (unit conversion)
    // In other contexts (with whitespace or other tokens between), treat as STRING (identifier)
    const format = SUPPORTED_FORMAT_STRINGS[normalizedResult];
    if (format && this.isValidFormatPosition(startPos)) {
      return {
        type: TokenType.FORMAT,
        value: format,
        line: this.line,
        pos: startPos,
        endPos: this.pos,
      };
    }

    return {
      type: TokenType.STRING,
      value: result,
      line: this.line,
      pos: startPos,
      endPos: this.pos,
    };
  }

  private reference(): Token {
    this.eat("{");

    const refStartPos = this.pos;
    let result = "";
    while (this.currentChar !== null && this.currentChar !== "}") {
      if (this.currentChar === "{") {
        if (this.tolerant) {
          // In tolerant mode, treat nested { as end of partial reference
          break;
        }
        this.error(LexerErrorCode.UNTERMINATED_REFERENCE, {});
      }
      if (isSpace(this.currentChar)) {
        this.advance();
        continue;
      }
      result += this.currentChar;
      this.advance();
    }

    if (this.currentChar === null) {
      if (this.tolerant) {
        // In tolerant mode, return a partial reference token
        return {
          type: TokenType.PARTIAL_REFERENCE,
          value: result,
          line: this.line,
          pos: refStartPos,
          endPos: this.pos,
        };
      }
      this.error(LexerErrorCode.UNTERMINATED_REFERENCE, {});
    }

    if (result === "") {
      if (this.tolerant) {
        // In tolerant mode, return empty partial reference
        return {
          type: TokenType.PARTIAL_REFERENCE,
          value: "",
          line: this.line,
          pos: refStartPos,
          endPos: this.pos,
        };
      }
      this.error(LexerErrorCode.EMPTY_VARIABLE_NAME, {});
    }

    const refEndPos = this.pos;
    this.eat("}");

    const token: Token = {
      type: TokenType.REFERENCE,
      value: result,
      line: this.line,
      pos: refStartPos,
      endPos: refEndPos,
    };
    // Track for FORMAT adjacency - use actual position after closing brace
    this._lastUnitableToken = { ...token, endPos: this.pos };
    return token;
  }

  private explicitString(quoteType: string): Token {
    const startPos = this.pos;
    this.eat(quoteType);

    let result = "";
    while (this.currentChar !== null && this.currentChar !== quoteType) {
      result += this.currentChar;
      this.advance();
    }

    if (this.currentChar === null) {
      if (this.tolerant) {
        // In tolerant mode, return a partial string token
        return {
          type: TokenType.PARTIAL_STRING,
          value: result,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        };
      }
      this.error(LexerErrorCode.UNTERMINATED_STRING, { quoteType });
    }

    this.eat(quoteType);

    return {
      type: TokenType.EXPLICIT_STRING,
      value: result,
      line: this.line,
      pos: startPos,
      endPos: this.pos,
    };
  }

  private hexColor(): Token {
    const startPos = this.pos;
    let result = "";
    while (isAlpha(this.currentChar) || this.isDigit() || this.currentChar === "#") {
      result += this.currentChar;
      this.advance();
    }
    // Support #RGB (4), #RGBA (5), #RRGGBB (7), #RRGGBBAA (9)
    if (result.length !== 4 && result.length !== 5 && result.length !== 7 && result.length !== 9) {
      if (this.tolerant) {
        // In tolerant mode, accept partial hex colors
        return {
          type: TokenType.HEX_COLOR,
          value: result,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        };
      }
      this.error(LexerErrorCode.INVALID_HEX_COLOR_FORMAT, {
        value: result,
        expectedLength: "#RGB, #RGBA, #RRGGBB, or #RRGGBBAA",
      });
    }
    return {
      type: TokenType.HEX_COLOR,
      value: result,
      line: this.line,
      pos: startPos,
      endPos: this.pos,
    };
  }

  private collectToken(token: Token): Token {
    if (this.tolerant) {
      this.collectedTokens.push(token);
    }
    return token;
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
        return this.collectToken(this.number());
      }

      if (this.currentChar === "'" || this.currentChar === '"') {
        return this.collectToken(this.explicitString(this.currentChar));
      }

      if (this.isValidIdentifierStart(this.currentChar)) {
        return this.collectToken(this.stringElement());
      }

      if (this.currentChar === "{") {
        return this.collectToken(this.reference());
      }
      if (this.currentChar === "[") {
        const startPos = this.pos;
        this.eat("[");
        return this.collectToken({
          type: TokenType.LBLOCK,
          value: "[",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "]") {
        const startPos = this.pos;
        this.eat("]");
        return this.collectToken({
          type: TokenType.RBLOCK,
          value: "]",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "!" && this.peek() === "=") {
        const startPos = this.pos;
        this.eat("!");
        this.eat("=");
        return this.collectToken({
          type: TokenType.IS_NOT_EQ,
          value: "!=",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "+") {
        const startPos = this.pos;
        this.eat("+");
        return this.collectToken({
          type: TokenType.OPERATION,
          value: Operations.ADD,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "-") {
        const startPos = this.pos;
        this.eat("-");
        return this.collectToken({
          type: TokenType.OPERATION,
          value: Operations.SUBTRACT,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "*") {
        const startPos = this.pos;
        this.eat("*");
        return this.collectToken({
          type: TokenType.OPERATION,
          value: Operations.MULTIPLY,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "/") {
        const startPos = this.pos;
        this.eat("/");
        return this.collectToken({
          type: TokenType.OPERATION,
          value: Operations.DIVIDE,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "^") {
        const startPos = this.pos;
        this.eat("^");
        return this.collectToken({
          type: TokenType.OPERATION,
          value: Operations.POWER,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "!") {
        const startPos = this.pos;
        this.eat("!");
        return this.collectToken({
          type: TokenType.OPERATION,
          value: Operations.LOGIC_NOT,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "(") {
        const startPos = this.pos;
        this.eat("(");
        return this.collectToken({
          type: TokenType.LPAREN,
          value: "(",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === ")") {
        const startPos = this.pos;
        this.eat(")");
        const token: Token = {
          type: TokenType.RPAREN,
          value: ")",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        };
        // Track for FORMAT adjacency detection (e.g., '(3px + 4px)rem')
        this._lastUnitableToken = token;
        return this.collectToken(token);
      }
      if (this.currentChar === ",") {
        const startPos = this.pos;
        this.eat(",");
        return this.collectToken({
          type: TokenType.COMMA,
          value: ",",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === ".") {
        if (this.peek() !== null && isNumber(this.peek())) {
          return this.collectToken(this.number());
        }
        const startPos = this.pos;
        this.eat(".");
        return this.collectToken({
          type: TokenType.DOT,
          value: ".",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "#") {
        return this.collectToken(this.hexColor());
      }
      if (this.currentChar === "%") {
        const startPos = this.pos;
        this.eat("%");
        return this.collectToken({
          type: TokenType.FORMAT,
          value: SupportedFormats.PERCENTAGE,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "=") {
        const startPos = this.pos;
        if (this.peek() === "=") {
          this.eat("=");
          this.eat("=");
          return this.collectToken({
            type: TokenType.IS_EQ,
            value: "==",
            line: this.line,
            pos: startPos,
            endPos: this.pos,
          });
        }
        this.eat("=");
        return this.collectToken({
          type: TokenType.ASSIGN,
          value: "=",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === ">") {
        const startPos = this.pos;
        if (this.peek() === "=") {
          this.eat(">");
          this.eat("=");
          return this.collectToken({
            type: TokenType.IS_GT_EQ,
            value: ">=",
            line: this.line,
            pos: startPos,
            endPos: this.pos,
          });
        }
        this.eat(">");
        return this.collectToken({
          type: TokenType.IS_GT,
          value: ">",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "<") {
        const startPos = this.pos;
        if (this.peek() === "=") {
          this.eat("<");
          this.eat("=");
          return this.collectToken({
            type: TokenType.IS_LT_EQ,
            value: "<=",
            line: this.line,
            pos: startPos,
            endPos: this.pos,
          });
        }
        this.eat("<");
        return this.collectToken({
          type: TokenType.IS_LT,
          value: "<",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === ";") {
        const startPos = this.pos;
        this.eat(";");
        return this.collectToken({
          type: TokenType.SEMICOLON,
          value: ";",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "&" && this.peek() === "&") {
        const startPos = this.pos;
        this.eat("&");
        this.eat("&");
        return this.collectToken({
          type: TokenType.LOGIC_AND,
          value: Operations.LOGIC_AND,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === "|" && this.peek() === "|") {
        const startPos = this.pos;
        this.eat("|");
        this.eat("|");
        return this.collectToken({
          type: TokenType.LOGIC_OR,
          value: Operations.LOGIC_OR,
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }
      if (this.currentChar === ":") {
        const startPos = this.pos;
        this.eat(":");
        return this.collectToken({
          type: TokenType.COLON,
          value: ":",
          line: this.line,
          pos: startPos,
          endPos: this.pos,
        });
      }

      // If we reach here, the character is not valid
      if (this.tolerant) {
        // In tolerant mode, skip invalid characters
        this.advance();
        // Continue to next iteration to try to find a valid token
        continue;
      }
      const char = this.currentChar === null ? "end of input" : this.currentChar;
      this.error(LexerErrorCode.INVALID_CHARACTER, {
        char,
        position: this.pos,
      });
    }
    const eofToken: Token = {
      type: TokenType.EOF,
      value: null,
      line: this.line,
      pos: this.pos,
      endPos: this.pos,
    };
    return this.collectToken(eofToken);
  }

  /**
   * Get all tokens that have been collected during tokenization.
   * This is useful for tolerant parsing to get all tokens including partial ones.
   */
  public getAllTokens(): Token[] {
    return [...this.collectedTokens];
  }

  /**
   * Tokenize the entire input and return all tokens.
   * This is a convenience method for tolerant parsing.
   */
  public tokenizeAll(): Token[] {
    const tokens: Token[] = [];
    let token = this.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token); // Include EOF
    return tokens;
  }

  peekToken(): Token | null {
    // Save current state
    const savedPos = this.pos;
    const savedChar = this.currentChar;
    const savedLine = this.line;
    const savedColumn = this.column;
    const savedCollectedLength = this.collectedTokens.length;

    const nextToken = this.nextToken();

    // Restore state (including collectedTokens to avoid duplicates in tolerant mode)
    this.pos = savedPos;
    this.currentChar = savedChar;
    this.line = savedLine;
    this.column = savedColumn;
    this.collectedTokens.length = savedCollectedLength;

    return nextToken.type === TokenType.EOF ? null : nextToken;
  }

  peekTokens(n: number): Token[] | null {
    // Save current state
    const savedPos = this.pos;
    const savedChar = this.currentChar;
    const savedLine = this.line;
    const savedColumn = this.column;
    const savedCollectedLength = this.collectedTokens.length;

    const tokens: Token[] = [];
    for (let i = 0; i < n; i++) {
      const token = this.nextToken();
      if (token.type === TokenType.EOF) {
        break;
      }
      tokens.push(token);
    }

    // Restore state (including collectedTokens to avoid duplicates in tolerant mode)
    this.pos = savedPos;
    this.currentChar = savedChar;
    this.line = savedLine;
    this.column = savedColumn;
    this.collectedTokens.length = savedCollectedLength;

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
