import { type ASTNode, Operations, ReservedKeyword, SCRIPT_ONLY_STATEMENT_KEYWORDS, type Token, TokenType } from "@src/types";
import {
  AssignNode,
  AttributeAccessNode,
  BinOpNode,
  BlockNode,
  BooleanNode,
  ElementWithUnitNode,
  ForEachNode,
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
  TemplateStringNode,
  TypeDeclNode,
  UnaryOpNode,
  WhileNode,
} from "./ast";
import { ParserError, ParserErrorCode } from "./errors";
import { Lexer, type LexerOptions } from "./lexer";
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
   * In tolerant mode, check if the current token is EOF after consuming an operator.
   * If so, record the incomplete info and return a PartialBinOpNode.
   * Returns null if not at EOF or not in tolerant mode.
   */
  private tryRecoverMissingOperand(left: ASTNode, opToken: Token): PartialBinOpNode | null {
    if (this.tolerant && this.currentToken.type === TokenType.EOF) {
      this.incompleteInfo.push({
        type: IncompleteType.MISSING_OPERAND,
        startPos: opToken.pos,
        endPos: opToken.endPos,
      });
      return new PartialBinOpNode(left, opToken);
    }
    return null;
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
        case ReservedKeyword.FOR:
          return this.forStatement();
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
      const partial = this.tryRecoverMissingOperand(node, token);
      if (partial) return partial;
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

  private forStatement(): ForEachNode {
    const forToken = this.eat(TokenType.RESERVED_KEYWORD); // 'for'

    // First identifier: item variable
    if (!this.isIdentifierToken()) {
      throw new ParserError(ParserErrorCode.EXPECTED_TOKEN_TYPE, {
        token: this.currentToken,
        data: { expectedType: "identifier", actualType: this.currentToken.type },
      });
    }
    const firstVar = this.currentToken.value as string;
    this.eat(this.currentToken.type);

    // Check for comma → item, index
    let indexVar: string | null = null;
    if (this.currentToken.type === TokenType.COMMA) {
      this.eat(TokenType.COMMA);
      if (!this.isIdentifierToken()) {
        throw new ParserError(ParserErrorCode.EXPECTED_TOKEN_TYPE, {
          token: this.currentToken,
          data: { expectedType: "identifier", actualType: this.currentToken.type },
        });
      }
      indexVar = this.currentToken.value as string;
      this.eat(this.currentToken.type);
    }

    // Expect contextual 'in' — parsed as STRING token with value "in"
    if (!this.isIdentifierToken() || this.currentToken.value !== "in") {
      throw new ParserError(ParserErrorCode.EXPECTED_TOKEN_TYPE, {
        token: this.currentToken,
        data: { expectedType: "'in'", actualType: this.currentToken.value },
      });
    }
    this.eat(this.currentToken.type);

    // Parse collection expression (e.g., [1, 2, 3], range(3), myList).
    const collection = this.expr();

    // Parse body block
    const body = this.block();

    // Consume optional trailing semicolon
    if (this.currentToken.type === TokenType.SEMICOLON) {
      this.eat(TokenType.SEMICOLON);
    }

    return new ForEachNode(
      firstVar,
      indexVar,
      collection,
      body.statements as StatementListNode,
      forToken,
    );
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

  // Explicit list literal: [expr, expr, ...]
  private explicitList(): ListNode {
    const token = this.currentToken;
    this.eat(TokenType.LBLOCK);

    const elements: ASTNode[] = [];

    if (this.currentToken.type !== TokenType.RBLOCK) {
      elements.push(this.expr());
      while (this.currentToken.type === TokenType.COMMA) {
        this.eat(TokenType.COMMA);
        elements.push(this.expr());
      }
    }

    this.eat(TokenType.RBLOCK);
    return new ListNode(elements, token);
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

  // comparison ((IS_EQ | IS_NOT_EQ | IS_GT | IS_LT | IS_GT_EQ | IS_LT_EQ) comparison)*
  private logicTerm(): ASTNode {
    let node = this.comparison();
    while (
      this.currentToken.type === TokenType.IS_EQ ||
      this.currentToken.type === TokenType.IS_NOT_EQ ||
      this.currentToken.type === TokenType.IS_GT ||
      this.currentToken.type === TokenType.IS_LT ||
      this.currentToken.type === TokenType.IS_GT_EQ ||
      this.currentToken.type === TokenType.IS_LT_EQ
    ) {
      const token = this.eat(this.currentToken.type);
      const partial = this.tryRecoverMissingOperand(node, token);
      if (partial) return partial;
      node = new BinOpNode(node, token, this.comparison());
    }
    return node;
  }

  // term ((ADD | SUBTRACT) term)*
  // Arithmetic addition/subtraction binds tighter than comparison operators.
  private comparison(): ASTNode {
    let node = this.term();
    while (
      this.currentToken.type === TokenType.OPERATION &&
      (this.currentToken.value === Operations.ADD ||
        this.currentToken.value === Operations.SUBTRACT)
    ) {
      const token = this.eat(TokenType.OPERATION);
      const partial = this.tryRecoverMissingOperand(node, token);
      if (partial) return partial;
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
      const partial = this.tryRecoverMissingOperand(node, token);
      if (partial) return partial;
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
      const partial = this.tryRecoverMissingOperand(node, token);
      if (partial) return partial;
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
    let node: ASTNode = new NumNode(this.currentToken);
    this.eat(TokenType.NUMBER);
    if (this.currentToken.type === TokenType.FORMAT) {
      return this.format(node);
    }
    node = this.attributeAccess(node);
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

    // Explicit list literal: [expr, expr, ...]
    if (token.type === TokenType.LBLOCK) {
      let node: ASTNode = this.explicitList();
      node = this.attributeAccess(node);
      return node;
    }

    // Handle unary operators
    if (
      token.type === TokenType.OPERATION &&
      (token.value === Operations.ADD ||
        token.value === Operations.SUBTRACT ||
        token.value === Operations.LOGIC_NOT)
    ) {
      this.eat(TokenType.OPERATION);
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
      let boolNode: ASTNode = new BooleanNode(token.value === ReservedKeyword.TRUE, token);
      boolNode = this.attributeAccess(boolNode);
      return boolNode;
    }

    if (token.type === TokenType.RESERVED_KEYWORD && token.value === ReservedKeyword.NULL) {
      this.eat(TokenType.RESERVED_KEYWORD);
      let nullNode: ASTNode = new NullNode(token);
      nullNode = this.attributeAccess(nullNode);
      return nullNode;
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
      return this.attributeAccess(node);
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
      let hexNode: ASTNode = new HexColorNode(token);
      hexNode = this.attributeAccess(hexNode);
      return hexNode;
    }

    // Handle partial string tokens
    if (token.type === TokenType.PARTIAL_STRING) {
      this.eat(TokenType.PARTIAL_STRING);
      const sourceText = this.lexer.getSourceInfo().text;
      const quoteType = sourceText[token.pos] ?? '"';
      this.incompleteInfo.push({
        type: IncompleteType.UNCLOSED_STRING,
        startPos: token.pos,
        endPos: token.endPos,
        partialValue: token.value,
      });
      return new PartialStringNode(token.value, quoteType, token);
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
    if (token.type === TokenType.TEMPLATE_STRING) {
      return this.templateString();
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
      const dotToken = this.eat(TokenType.DOT);
      // In tolerant mode, handle trailing dot without property name
      // Cast needed: TS narrows currentToken.type after the while(DOT) guard,
      // but eat() replaces currentToken so it can now be EOF.
      if (this.tolerant && (this.currentToken.type as TokenType) === TokenType.EOF) {
        this.incompleteInfo.push({
          type: IncompleteType.TRAILING_DOT,
          startPos: dotToken.pos,
          endPos: dotToken.endPos,
        });
        break;
      }
      // Accept STRING or FORMAT as valid identifier in attribute position
      // FORMAT tokens (like 's', 'ms') can still be valid attribute names
      if (this.isIdentifierToken()) {
        const nextToken = this.lexer.peekToken();
        if (nextToken && nextToken.type === TokenType.LPAREN) {
          // It's a method call
          const methodName = this.currentToken.value as string;
          this.eat(this.currentToken.type);
          const funcCall = this.functionCall({ ...this.currentToken, value: methodName } as Token);
          node = new AttributeAccessNode(node, funcCall);
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

  private functionCall(functionName: Token): FunctionCallNode | PartialFunctionCallNode {
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

  /**
   * Parse a TEMPLATE_STRING token into a TemplateStringNode.
   * Scans the raw content for:
   *   - {ref.path} → ReferenceNode
   *   - ${expression} → parsed sub-expression
   *   - \{ \${ \` \\ → escaped literals (backslash removed)
   *   - everything else → literal StringNode segments
   */
  private templateString(): ASTNode {
    const token = this.currentToken;
    const raw = token.value as string;
    this.eat(TokenType.TEMPLATE_STRING);

    const parts: ASTNode[] = [];
    let literal = "";
    let i = 0;

    const flushLiteral = () => {
      if (literal.length > 0) {
        parts.push(new StringNode({ ...token, value: literal }));
        literal = "";
      }
    };

    while (i < raw.length) {
      const ch = raw[i];

      // Escape sequences: \{ \${ \$ \` \\
      if (ch === "\\" && i + 1 < raw.length) {
        const next = raw[i + 1];
        if (next === "{" || next === "`" || next === "\\") {
          literal += next;
          i += 2;
          continue;
        }
        if (next === "$") {
          if (i + 2 < raw.length && raw[i + 2] === "{") {
            // \${ → literal "${", prevents expression interpolation
            literal += "${";
            i += 3;
          } else {
            // \$ → literal "$"
            literal += "$";
            i += 2;
          }
          continue;
        }
      }

      // Expression interpolation: ${...}
      if (ch === "$" && i + 1 < raw.length && raw[i + 1] === "{") {
        flushLiteral();
        // Find matching closing brace (tracking nesting, rejecting backticks)
        const start = i + 2;
        let depth = 1;
        let j = start;
        while (j < raw.length && depth > 0) {
          if (raw[j] === "`") {
            this.error(ParserErrorCode.INVALID_SYNTAX, {
              message: "Nested template strings are not allowed inside ${...}",
            });
          }
          if (raw[j] === "{") depth++;
          else if (raw[j] === "}") depth--;
          if (depth > 0) j++;
        }
        if (depth !== 0) {
          this.error(ParserErrorCode.INVALID_SYNTAX, {
            message: "Unterminated ${...} in template string",
          });
        }
        const exprStr = raw.slice(start, j);
        const subLexer = new Lexer(exprStr);
        const subParser = new Parser(subLexer);
        const exprNode = subParser.expr();
        // Collect references from the sub-expression
        for (const ref of subParser.requiredReferences) {
          this.requiredReferences.add(ref);
        }
        parts.push(exprNode);
        i = j + 1; // skip past closing }
        continue;
      }

      // Reference interpolation: {ref.path}
      if (ch === "{") {
        flushLiteral();
        const start = i + 1;
        let j = start;
        while (j < raw.length && raw[j] !== "}") {
          if (raw[j] === "{") {
            this.error(ParserErrorCode.INVALID_SYNTAX, {
              message: "Nested braces in template reference",
            });
          }
          j++;
        }
        if (j >= raw.length) {
          this.error(ParserErrorCode.INVALID_SYNTAX, {
            message: "Unterminated {ref} in template string",
          });
        }
        let refPath = raw.slice(start, j);
        // Strip whitespace inside reference (same as lexer behavior)
        refPath = refPath.replace(/[ \t]/g, "");
        if (refPath.length === 0) {
          this.error(ParserErrorCode.INVALID_SYNTAX, {
            message: "Empty reference in template string",
          });
        }
        this.requiredReferences.add(refPath);
        parts.push(
          new ReferenceNode({
            ...token,
            type: TokenType.REFERENCE,
            value: refPath,
          }),
        );
        i = j + 1; // skip past closing }
        continue;
      }

      // Regular character
      literal += ch;
      i++;
    }

    flushLiteral();

    // Optimization: if the template has zero interpolations, return a plain StringNode
    if (parts.length === 1 && parts[0] instanceof StringNode) {
      return parts[0];
    }

    return new TemplateStringNode(parts, token);
  }

  public parse(inlineMode = false): ASTNode | null {
    if (this.tolerant && !inlineMode) {
      this.error(ParserErrorCode.TOLERANT_REQUIRES_INLINE);
    }

    if (this.currentToken.type === TokenType.EOF) return null;

    if (inlineMode) {
      // Reject script-only keywords immediately — they cannot appear in inline mode.
      if (
        this.currentToken.type === TokenType.RESERVED_KEYWORD &&
        SCRIPT_ONLY_STATEMENT_KEYWORDS.has(this.currentToken.value)
      ) {
        this.error(ParserErrorCode.UNALLOWED_INLINE_SYNTAX, {
          originalError: `Unexpected token: ${this.currentToken.value}`,
        });
      }
      const node = this.listExpr();
      // Reject unconsumed tokens (e.g. `1 + 2; 3 + 4` — the `; 3 + 4` would
      // otherwise be silently discarded). Aligns with Go's ParseInline().
      if (!this.tolerant && (this.currentToken.type as TokenType) !== TokenType.EOF) {
        this.error(ParserErrorCode.UNEXPECTED_TOKEN, {
          token: String(this.currentToken.value),
        });
      }
      return node;
    }

    const node = this.statementsList();
    if ((this.currentToken.type as TokenType) !== TokenType.EOF) {
      this.error(ParserErrorCode.INVALID_SYNTAX, {
        message: "Unexpected token at the end of input.",
      });
    }
    return node;
  }
}

export interface ParseExpressionResult {
  lexer: Lexer;
  parser: Parser;
  ast: ASTNode | null;
}

/**
 * Parsing mode — determines how the lexer and parser behave.
 *
 * - `"inline"` — Expression-only mode for token `$value` fields.
 *   Enables greedy strings (URLs, dotted paths parsed as single tokens).
 *   No statements (variable, if, while, etc.).
 *
 * - `"script"` — Full statement mode for schema/function bodies.
 *   Standard lexing (`:`, `.`, `/` produce separate tokens).
 */
export type ParseMode = "inline" | "script";

/**
 * Derive LexerOptions from a ParseMode, with optional overrides.
 *
 * Centralises the coupling between mode and lexer flags so call sites
 * don't have to manually keep them in sync.
 */
export function lexerOptionsForMode(
  mode: ParseMode,
  overrides?: Partial<LexerOptions>,
): LexerOptions {
  const base: LexerOptions = mode === "inline" ? { greedyStrings: true } : {};
  return { ...base, ...overrides };
}

export interface ParseExpressionOptions {
  /** Parsing mode. Defaults to `"script"`. */
  mode?: ParseMode;
  /** Extra lexer options merged on top of the mode defaults. */
  lexerOverrides?: Partial<LexerOptions>;
}

export function parseExpression(
  text: string,
  options?: ParseExpressionOptions,
): ParseExpressionResult {
  const mode = options?.mode ?? "script";
  const lexer = new Lexer(text, lexerOptionsForMode(mode, options?.lexerOverrides));
  const parser = new Parser(lexer);
  const ast = parser.parse(mode === "inline");

  return {
    lexer,
    parser,
    ast,
  };
}
