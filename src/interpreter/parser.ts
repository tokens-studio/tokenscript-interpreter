import { type ASTNode, Operations, ReservedKeyword, type Token, TokenType } from "@src/types";
import {
  AssignNode,
  AttributeAccessNode,
  BinOpNode,
  BlockNode,
  BooleanNode,
  ElementWithUnitNode,
  FunctionCallNode,
  HexColorNode,
  IdentifierNode,
  IfConditionNode,
  IfNode,
  ImplicitListNode,
  ListNode,
  NullNode,
  NumNode,
  ReassignNode,
  ReferenceNode,
  ReturnNode,
  StatementListNode,
  StringNode,
  TypeDeclNode,
  UnaryOpNode,
  WhileNode,
} from "./ast";
import { ParserError, ParserErrorCode } from "./errors";
import { Lexer } from "./lexer";
import {
  PartialBinOpNode,
  PartialFunctionCallNode,
  PartialParenNode,
  PartialReferenceNode,
  PartialStringNode,
  PartialUnaryOpNode,
} from "./tolerant/partial-nodes";
import type { IncompleteInfo } from "./tolerant/types";
import { IncompleteType } from "./tolerant/types";

/**
 * Options for the Parser
 */
export interface ParserOptions {
  /**
   * If true, the parser will not throw errors on incomplete input.
   * Instead, it will return partial AST nodes where appropriate.
   */
  tolerant?: boolean;
}

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  public requiredReferences: Set<string> = new Set();
  private tolerant: boolean;
  private incompleteInfo: IncompleteInfo[] = [];

  constructor(lexer: Lexer, options?: ParserOptions) {
    this.lexer = lexer;
    this.currentToken = this.lexer.nextToken();
    this.tolerant = options?.tolerant ?? false;
  }

  /**
   * Check if the parser encountered any incomplete constructs
   */
  public hasIncomplete(): boolean {
    return this.incompleteInfo.length > 0;
  }

  /**
   * Get information about incomplete constructs
   */
  public getIncomplete(): IncompleteInfo[] {
    return [...this.incompleteInfo];
  }

  private formatError(message: string, token: Token = this.currentToken): string {
    const {
      text: sourceText,
      line: currentLine,
      column: currentColumn,
    } = this.lexer.getSourceInfo();
    const lines = sourceText.split("\n");
    const tokenLine = token.line;
    const errorLineText = lines[tokenLine - 1] || "";

    // Find the column position of the token
    let column = 1;

    if (currentLine === tokenLine) {
      // If we're on the same line, use the current column position
      column = currentColumn;
    } else {
      // If token is from a previous line, estimate the column by finding the token value
      const tokenValue = String(token.value || "");
      const tokenIndex = errorLineText.indexOf(tokenValue);
      if (tokenIndex >= 0) {
        column = tokenIndex + 1;
      }
    }

    // Show context lines (2 before, 2 after)
    const contextLines = 2;
    const startLine = Math.max(0, tokenLine - 1 - contextLines);
    const endLine = Math.min(lines.length - 1, tokenLine - 1 + contextLines);

    let contextText = "";
    for (let i = startLine; i <= endLine; i++) {
      const lineNum = i + 1;
      const lineText = lines[i] || "";
      const isErrorLine = lineNum === tokenLine;

      // Add line number prefix
      const linePrefix = `${lineNum.toString().padStart(3, " ")} | `;
      contextText += `${linePrefix + lineText}\n`;

      // Add pointer line for the error line
      if (isErrorLine) {
        const pointer = `${" ".repeat(linePrefix.length - 1 + Math.max(0, column - 1))}^`;
        contextText += `${pointer}\n`;
      }
    }

    return `${message}\n\n${contextText}`;
  }

  private peekTokens(n: number): Token[] | null {
    return this.lexer.peekTokens(n);
  }

  /**
   * Check if the current token can be treated as an identifier.
   * FORMAT tokens (like 's', 'ms') are valid identifiers in most contexts
   * (variable names, attribute names, type names).
   */
  private isIdentifierToken(token: Token = this.currentToken): boolean {
    return token.type === TokenType.STRING || token.type === TokenType.FORMAT;
  }

  /**
   * Eat an identifier token (STRING or FORMAT).
   * FORMAT tokens can be valid identifiers in contexts like variable names,
   * attribute names, and type names.
   */
  private eatIdentifier(): Token {
    if (this.isIdentifierToken()) {
      const token = this.currentToken;
      this.eat(this.currentToken.type);
      return token;
    }
    this.error(ParserErrorCode.UNEXPECTED_TOKEN, { token: String(this.currentToken.value) });
  }

  private error(code: ParserErrorCode, data?: Record<string, unknown>): never {
    const message = data?.message ? String(data.message) : undefined;
    const formattedMessage = this.formatError(
      message || (code === ParserErrorCode.INVALID_SYNTAX ? "Invalid syntax" : code),
    );
    throw new ParserError(code, {
      token: this.currentToken,
      data: { ...data, message: formattedMessage },
    });
  }

  private eat(tokenType: TokenType): Token {
    const token = this.currentToken;
    if (this.currentToken.type === tokenType) {
      this.currentToken = this.lexer.nextToken();
    } else {
      this.error(ParserErrorCode.EXPECTED_TOKEN_TYPE, {
        expected: tokenType,
        got: this.currentToken.type,
      });
    }
    return token;
  }

  private typeDeclaration(): TypeDeclNode {
    const baseTypeToken = this.eatIdentifier();
    const baseType = new IdentifierNode(baseTypeToken);

    const subTypes: IdentifierNode[] = [];
    while (this.currentToken.type === TokenType.DOT) {
      this.eat(TokenType.DOT);
      const subTypeToken = this.eatIdentifier();
      subTypes.push(new IdentifierNode(subTypeToken));
    }
    return new TypeDeclNode(baseType, subTypes, baseTypeToken);
  }

  private statementsList(): ASTNode | StatementListNode {
    const statements: ASTNode[] = [];
    const token = this.currentToken;

    while (
      this.currentToken.type !== TokenType.EOF &&
      this.currentToken.type !== TokenType.RBLOCK
    ) {
      statements.push(this.statement());
      if (this.currentToken.type === TokenType.SEMICOLON) {
        this.eat(TokenType.SEMICOLON);
      } else {
        if (
          (this.currentToken.type as TokenType) === TokenType.EOF ||
          (this.currentToken.type as TokenType) === TokenType.RBLOCK
        ) {
          break;
        }
      }
    }

    if (statements.length === 1) {
      return statements[0];
    }

    return new StatementListNode(statements, token);
  }

  private statement(): ASTNode {
    if (this.currentToken.type === TokenType.RESERVED_KEYWORD) {
      switch (this.currentToken.value) {
        case ReservedKeyword.RETURN:
          return this.returnStatement();
        case ReservedKeyword.WHILE:
          return this.whileStatement();
        case ReservedKeyword.IF:
          return this.ifStatement();
        case ReservedKeyword.VARIABLE:
          return this.assignVariable();
      }
    } else if (this.isIdentifierToken()) {
      // Look ahead to check the token sequence for property reassignment (e.g., output.s = ...)
      const nextTokens = this.peekTokens(4); // Get next 4 tokens
      if (nextTokens !== null) {
        for (let i = 0; i < nextTokens.length - 1; i += 2) {
          if (nextTokens[i].type === TokenType.DOT && this.isIdentifierToken(nextTokens[i + 1])) {
            if (i + 2 < nextTokens.length && nextTokens[i + 2].type === TokenType.ASSIGN) {
              const name = this.currentToken;
              this.eat(this.currentToken.type);
              return this.reassignVariable(name);
            }
          }
        }
      }

      // Check for simple variable reassignment (var = ...)
      const nextToken = this.lexer.peekToken();
      if (nextToken && nextToken.type === TokenType.ASSIGN) {
        return this.reassignVariable();
      }
    }

    return this.listExpr();
  }

  private assignVariable(): AssignNode {
    const token = this.eat(TokenType.RESERVED_KEYWORD);

    const varNameToken = this.eatIdentifier();
    const varName = new IdentifierNode(varNameToken);
    this.eat(TokenType.COLON);

    const typeDecl = this.typeDeclaration();

    if (this.currentToken.type === TokenType.ASSIGN) {
      this.eat(TokenType.ASSIGN);
      const assignmentExpr = this.listExpr();
      return new AssignNode(varName, typeDecl, assignmentExpr, token);
    }

    return new AssignNode(varName, typeDecl, null, token);
  }

  private reassignVariable(nameToken?: Token): ReassignNode {
    const varNameToken = nameToken || this.eatIdentifier();
    let name: IdentifierNode | IdentifierNode[] = new IdentifierNode(varNameToken);

    if (this.currentToken.type === TokenType.DOT) {
      const names: IdentifierNode[] = [new IdentifierNode(varNameToken)];
      while (this.currentToken.type === TokenType.DOT) {
        this.eat(TokenType.DOT);
        const propertyToken = this.eatIdentifier();
        names.push(new IdentifierNode(propertyToken));
      }
      name = names;
    }

    this.eat(TokenType.ASSIGN);

    const assignmentExpr = this.listExpr();

    return new ReassignNode(name, assignmentExpr, varNameToken);
  }

  private reference(): ASTNode {
    const token = this.currentToken;

    // Handle partial reference tokens (from tolerant lexer)
    if (token.type === TokenType.PARTIAL_REFERENCE) {
      this.eat(TokenType.PARTIAL_REFERENCE);
      this.incompleteInfo.push({
        type: IncompleteType.UNCLOSED_REFERENCE,
        startPos: token.pos,
        endPos: token.endPos,
        partialValue: token.value,
      });
      return new PartialReferenceNode(token.value, token);
    }

    const node = new ReferenceNode(token);
    this.eat(TokenType.REFERENCE);
    this.requiredReferences.add(node.value);

    if (this.currentToken.type === TokenType.FORMAT) {
      return this.format(node);
    }
    return node;
  }

  // logic_term ((AND | OR) logic_term)*
  private expr(): ASTNode {
    let node = this.logicTerm();
    while (
      this.currentToken.type === TokenType.LOGIC_AND ||
      this.currentToken.type === TokenType.LOGIC_OR
    ) {
      const token = this.eat(this.currentToken.type);
      node = new BinOpNode(node, token, this.logicTerm());
    }
    return node;
  }

  private conditionExpr(): ASTNode {
    if (this.currentToken.type === TokenType.STRING) {
      const nextToken = this.lexer.peekToken();
      if (nextToken && nextToken.type === TokenType.ASSIGN) {
        throw new ParserError(ParserErrorCode.CONDITION_MUST_BE_BOOLEAN, {
          token: this.currentToken,
        });
      }
    }

    return this.expr();
  }

  private returnStatement(): ReturnNode {
    const token = this.eat(TokenType.RESERVED_KEYWORD); // 'return'
    const expr = this.listExpr();
    return new ReturnNode(expr, token);
  }

  private whileStatement(): WhileNode {
    const whileToken = this.eat(TokenType.RESERVED_KEYWORD); // 'while'
    this.eat(TokenType.LPAREN);
    const condition = this.conditionExpr();
    this.eat(TokenType.RPAREN);
    const body = this.block();
    return new WhileNode(condition, body.statements as StatementListNode, whileToken);
  }

  private ifStatement(): IfNode {
    const ifToken = this.eat(TokenType.RESERVED_KEYWORD); // 'if'
    this.eat(TokenType.LPAREN);
    const condition = this.conditionExpr();
    this.eat(TokenType.RPAREN);
    const ifBody = this.block().statements as StatementListNode;

    const conditions = [new IfConditionNode(condition, ifBody, ifToken)];

    // Handle elif clauses
    while (
      this.currentToken.type === TokenType.RESERVED_KEYWORD &&
      this.currentToken.value === ReservedKeyword.ELIF
    ) {
      this.eat(TokenType.RESERVED_KEYWORD); // 'elif'
      this.eat(TokenType.LPAREN);
      const elifCondition = this.conditionExpr();
      this.eat(TokenType.RPAREN);
      const elifBody = this.block().statements as StatementListNode;
      conditions.push(new IfConditionNode(elifCondition, elifBody, ifToken));
    }

    // Check for 'else' block
    let elseBody: StatementListNode | null = null;
    if (
      this.currentToken.type === TokenType.RESERVED_KEYWORD &&
      this.currentToken.value === ReservedKeyword.ELSE
    ) {
      this.eat(TokenType.RESERVED_KEYWORD); // 'else'
      elseBody = this.block().statements as StatementListNode;
    }

    return new IfNode(conditions, elseBody, ifToken);
  }

  private block(): BlockNode {
    this.eat(TokenType.LBLOCK);
    const statements = this.statementsList() as StatementListNode;
    this.eat(TokenType.RBLOCK);
    return new BlockNode(statements);
  }

  // implicit_list_expr : factor ((COMMA) factor)*
  private implicitListExpr(): ASTNode {
    const token = this.currentToken;
    const elements: ASTNode[] = [this.expr()];

    while (
      this.currentToken.type !== TokenType.COMMA &&
      this.currentToken.type !== TokenType.RPAREN &&
      this.currentToken.type !== TokenType.EOF &&
      this.currentToken.type !== TokenType.SEMICOLON
    ) {
      elements.push(this.expr());
    }

    if (elements.length === 1) return elements[0];

    return new ImplicitListNode(elements, token);
  }

  // factor ((COMMA) factor)
  private listExpr(): ASTNode {
    const firstToken = this.currentToken;
    const elements: ASTNode[] = [this.implicitListExpr()];

    while (this.currentToken.type === TokenType.COMMA) {
      this.eat(TokenType.COMMA);
      elements.push(this.implicitListExpr());
    }

    if (elements.length === 1) {
      return elements[0];
    }

    return new ListNode(elements, firstToken);
  }

  // term ((PLUS | MINUS) term)*
  private logicTerm(): ASTNode {
    let node = this.comparison();
    while (
      this.currentToken.type === TokenType.OPERATION &&
      (this.currentToken.value === Operations.ADD ||
        this.currentToken.value === Operations.SUBTRACT)
    ) {
      const token = this.eat(TokenType.OPERATION);
      // In tolerant mode, handle EOF after operator
      if (this.tolerant && (this.currentToken.type as TokenType) === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.MISSING_OPERAND,
          startPos: token.pos,
          endPos: token.endPos,
        });
        return new PartialBinOpNode(node, token);
      }
      node = new BinOpNode(node, token, this.comparison());
    }
    return node;
  }

  // term ((IS_EQ | IS_NOT_EQ | IS_GT | IS_LT | IS_GT_EQ | IS_LT_EQ) term)*
  private comparison(): ASTNode {
    let node = this.term();
    while (
      this.currentToken.type === TokenType.IS_EQ ||
      this.currentToken.type === TokenType.IS_NOT_EQ ||
      this.currentToken.type === TokenType.IS_GT ||
      this.currentToken.type === TokenType.IS_LT ||
      this.currentToken.type === TokenType.IS_GT_EQ ||
      this.currentToken.type === TokenType.IS_LT_EQ
    ) {
      const token = this.eat(this.currentToken.type);
      // In tolerant mode, handle EOF after operator
      if (this.tolerant && (this.currentToken.type as TokenType) === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.MISSING_OPERAND,
          startPos: token.pos,
          endPos: token.endPos,
        });
        return new PartialBinOpNode(node, token);
      }
      node = new BinOpNode(node, token, this.term());
    }
    return node;
  }

  // Term = Power (("*" | "/") Power)*
  private term(): ASTNode {
    let node = this.power();
    while (
      this.currentToken.type === TokenType.OPERATION &&
      (this.currentToken.value === Operations.MULTIPLY ||
        this.currentToken.value === Operations.DIVIDE)
    ) {
      const token = this.eat(TokenType.OPERATION);
      // In tolerant mode, handle EOF after operator
      if (this.tolerant && (this.currentToken.type as TokenType) === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.MISSING_OPERAND,
          startPos: token.pos,
          endPos: token.endPos,
        });
        return new PartialBinOpNode(node, token);
      }
      node = new BinOpNode(node, token, this.power());
    }
    return node;
  }

  // factor (POWER factor)*
  private power(): ASTNode {
    let node = this.factor();
    while (
      this.currentToken.type === TokenType.OPERATION &&
      this.currentToken.value === Operations.POWER
    ) {
      const token = this.eat(TokenType.OPERATION);
      // In tolerant mode, handle EOF after operator
      if (this.tolerant && (this.currentToken.type as TokenType) === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.MISSING_OPERAND,
          startPos: token.pos,
          endPos: token.endPos,
        });
        return new PartialBinOpNode(node, token);
      }
      node = new BinOpNode(node, token, this.factor());
    }
    return node;
  }

  private format(node: ASTNode): ASTNode {
    const formatToken = this.currentToken;
    this.eat(TokenType.FORMAT);
    return new ElementWithUnitNode(node, formatToken.value);
  }

  private number(): ASTNode {
    const node = new NumNode(this.currentToken);
    this.eat(TokenType.NUMBER);
    if (this.currentToken.type === TokenType.FORMAT) {
      return this.format(node);
    }
    return node;
  }

  // factor : PLUS factor
  //        | MINUS factor
  //        | NOT factor
  //        | NUMBER (FORMAT)?
  //        | LPAREN expr RPAREN (FORMAT)?
  //        | REFERENCE (DOT (STRING | function))*
  //        | STRING (LPAREN args RPAREN)? (DOT (STRING | function))*
  //        | EXPLICIT_STRING (DOT (STRING | function))*
  //        | HEX_COLOR
  private factor(): ASTNode {
    const token = this.currentToken;

    // Handle unary operators
    if (
      token.type === TokenType.OPERATION &&
      (token.value === Operations.ADD ||
        token.value === Operations.SUBTRACT ||
        token.value === Operations.LOGIC_NOT)
    ) {
      this.eat(TokenType.OPERATION);
      // In tolerant mode, handle EOF after unary operator
      if (this.tolerant && this.currentToken.type === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.MISSING_OPERAND,
          startPos: token.pos,
          endPos: token.endPos,
        });
        return new PartialUnaryOpNode(token);
      }
      return new UnaryOpNode(token, this.factor());
    }

    if (
      token.type === TokenType.RESERVED_KEYWORD &&
      (token.value === ReservedKeyword.TRUE || token.value === ReservedKeyword.FALSE)
    ) {
      this.eat(TokenType.RESERVED_KEYWORD);
      return new BooleanNode(token.value === ReservedKeyword.TRUE, token);
    }

    if (token.type === TokenType.RESERVED_KEYWORD && token.value === ReservedKeyword.NULL) {
      this.eat(TokenType.RESERVED_KEYWORD);
      return new NullNode(token);
    }

    if (token.type === TokenType.NUMBER) {
      return this.number();
    }

    if (token.type === TokenType.LPAREN) {
      const lparenToken = token;
      this.eat(TokenType.LPAREN);

      // In tolerant mode, handle EOF or empty paren
      if (this.tolerant && this.currentToken.type === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.UNCLOSED_PAREN,
          startPos: lparenToken.pos,
        });
        // Return a partial node with null expression
        return new PartialParenNode(new NullNode(lparenToken), lparenToken);
      }

      const node = this.expr();

      // In tolerant mode, handle missing closing paren
      if (this.tolerant && this.currentToken.type === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.UNCLOSED_PAREN,
          startPos: lparenToken.pos,
        });
        return new PartialParenNode(node, lparenToken);
      }

      this.eat(TokenType.RPAREN);
      if (this.currentToken.type === TokenType.FORMAT) {
        return this.format(node);
      }
      return node;
    }

    // Handle partial reference tokens
    if (token.type === TokenType.PARTIAL_REFERENCE) {
      let node = this.reference();
      node = this.attributeAccess(node);
      return node;
    }

    if (token.type === TokenType.REFERENCE) {
      let node = this.reference();
      // Handle attribute access like {ref}.property or {ref}.method()
      node = this.attributeAccess(node);
      return node;
    }

    if (token.type === TokenType.HEX_COLOR) {
      this.eat(TokenType.HEX_COLOR);
      return new HexColorNode(token);
    }

    // Handle partial string tokens
    if (token.type === TokenType.PARTIAL_STRING) {
      this.eat(TokenType.PARTIAL_STRING);
      this.incompleteInfo.push({
        type: IncompleteType.UNCLOSED_STRING,
        startPos: token.pos,
        endPos: token.endPos,
        partialValue: token.value,
      });
      return new PartialStringNode(token.value, '"', token);
    }

    // Identifier or function call
    // FORMAT tokens (like 's', 'ms') can be used as identifiers/function names
    if (this.isIdentifierToken(token)) {
      this.eat(token.type);
      let node: ASTNode;
      // After eating the identifier, currentToken is updated.
      // This comparison (this.currentToken.type as TokenType) === TokenType.LPAREN is valid.
      if ((this.currentToken.type as TokenType) === TokenType.LPAREN) {
        // Function call
        node = this.functionCall(token);
      } else {
        // Identifier
        node = new IdentifierNode(token);
      }
      // Handle attribute access like ident.property or ident.method()
      node = this.attributeAccess(node);
      return node;
    }
    if (token.type === TokenType.EXPLICIT_STRING) {
      this.eat(TokenType.EXPLICIT_STRING);
      let node: ASTNode = new StringNode(token);
      node = this.attributeAccess(node); // For string methods like "hello".length()
      return node;
    }

    // In tolerant mode, handle EOF gracefully
    if (this.tolerant && token.type === TokenType.EOF) {
      return new NullNode(token);
    }

    this.error(ParserErrorCode.UNEXPECTED_TOKEN, { token: String(token.value) });
  }

  private attributeAccess(leftNode: ASTNode): ASTNode {
    let node = leftNode;
    while (this.currentToken.type === TokenType.DOT) {
      this.eat(TokenType.DOT);
      // Accept STRING or FORMAT as valid identifier in attribute position
      // FORMAT tokens (like 's', 'ms') can still be valid attribute names
      if (this.isIdentifierToken()) {
        const nextToken = this.lexer.peekToken();
        if (nextToken && nextToken.type === TokenType.LPAREN) {
          // It's a method call
          const methodName = this.currentToken.value as string;
          this.eat(this.currentToken.type);
          const funcCall = this.functionCall({ ...this.currentToken, value: methodName } as Token);
          node = new AttributeAccessNode(
            node,
            funcCall as FunctionCallNode | PartialFunctionCallNode,
          );
        } else {
          // It's a property access
          const attrToken = this.currentToken;
          this.eat(this.currentToken.type);
          node = new AttributeAccessNode(node, new IdentifierNode(attrToken));
        }
      }
    }
    return node;
  }

  private functionCall(functionName: Token): ASTNode {
    this.eat(TokenType.LPAREN);
    const args: ASTNode[] = [];
    while (this.currentToken.type !== TokenType.RPAREN) {
      // In tolerant mode, handle EOF before closing paren
      if (this.tolerant && this.currentToken.type === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.UNCLOSED_FUNCTION,
          startPos: functionName.pos,
          partialValue: functionName.value as string,
        });
        return new PartialFunctionCallNode(functionName.value as string, args, functionName);
      }
      if (this.currentToken.type === TokenType.COMMA) {
        this.eat(TokenType.COMMA);
      }
      args.push(this.implicitListExpr());
    }
    this.eat(TokenType.RPAREN);
    return new FunctionCallNode(functionName.value as string, args, functionName);
  }

  public parse(inlineMode = false): ASTNode | null {
    if (this.currentToken.type === TokenType.EOF) return null;

    if (inlineMode) return this.listExpr();

    const node = this.statementsList();
    if ((this.currentToken.type as TokenType) !== TokenType.EOF) {
      // In tolerant mode, don't throw for trailing tokens
      if (!this.tolerant) {
        this.error(ParserErrorCode.INVALID_SYNTAX, {
          message: "Unexpected token at the end of input.",
        });
      }
    }
    return node;
  }
}

export interface ParseExpressionResult {
  lexer: Lexer;
  parser: Parser;
  ast: ASTNode | null;
}

export function parseExpression(text: string): ParseExpressionResult {
  const lexer = new Lexer(text);
  const parser = new Parser(lexer);
  const ast = parser.parse();

  return {
    lexer,
    parser,
    ast,
  };
}
