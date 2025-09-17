import { type ASTNode, Operations, ReservedKeyword, type Token, TokenType } from "../types";
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
  IfNode,
  ImplicitListNode,
  ListNode,
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
import { ParserError } from "./errors";
import { Lexer } from "./lexer";

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  public requiredReferences: Set<string> = new Set();

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = this.lexer.nextToken();
  }

  private formatError(message: string, token: Token = this.currentToken): string {
    const { text: sourceText, line: currentLine, column: currentColumn } = this.lexer.getSourceInfo();
    const lines = sourceText.split('\n');
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
      const linePrefix = `${lineNum.toString().padStart(3, ' ')} | `;
      contextText += linePrefix + lineText + '\n';
      
      // Add pointer line for the error line
      if (isErrorLine) {
        const pointer = " ".repeat(linePrefix.length + Math.max(0, column - 1)) + "^";
        contextText += pointer + '\n';
      }
    }
    
    return `${message}\n\n${contextText.trim()}`;
  }

  private peekTokens(n: number): Token[] | null {
    return this.lexer.peekTokens(n);
  }

  private error(message = "Invalid syntax"): never {
    const formattedMessage = this.formatError(message);
    throw new ParserError(formattedMessage, this.currentToken?.line, this.currentToken);
  }

  private eat(tokenType: TokenType): Token {
    const token = this.currentToken;
    if (this.currentToken.type === tokenType) {
      this.currentToken = this.lexer.nextToken();
    } else {
      this.error(`Expected token type ${tokenType} but got ${this.currentToken.type}`);
    }
    return token;
  }

  private typeDeclaration(): TypeDeclNode {
    const baseTypeToken = this.eat(TokenType.STRING);
    const baseType = new IdentifierNode(baseTypeToken);

    const subTypes: IdentifierNode[] = [];
    while (this.currentToken.type === TokenType.DOT) {
      this.eat(TokenType.DOT);
      const subTypeToken = this.eat(TokenType.STRING);
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
    } else if (this.currentToken.type === TokenType.STRING) {
      // Look ahead to check the token sequence
      const nextTokens = this.peekTokens(4); // Get next 4 tokens
      if (nextTokens !== null) {
        for (let i = 0; i < nextTokens.length - 1; i += 2) {
          if (nextTokens[i].type === TokenType.DOT && nextTokens[i + 1].type === TokenType.STRING) {
            if (i + 2 < nextTokens.length && nextTokens[i + 2].type === TokenType.ASSIGN) {
              const name = this.currentToken;
              this.eat(TokenType.STRING);
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

    const varNameToken = this.eat(TokenType.STRING);
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
    const varNameToken = nameToken || this.eat(TokenType.STRING);
    let name: IdentifierNode | IdentifierNode[] = new IdentifierNode(varNameToken);

    if (this.currentToken.type === TokenType.DOT) {
      const names: IdentifierNode[] = [new IdentifierNode(varNameToken)];
      while (this.currentToken.type === TokenType.DOT) {
        this.eat(TokenType.DOT);
        const propertyToken = this.eat(TokenType.STRING);
        names.push(new IdentifierNode(propertyToken));
      }
      name = names;
    }

    this.eat(TokenType.ASSIGN);

    const assignmentExpr = this.listExpr();

    return new ReassignNode(name, assignmentExpr, varNameToken);
  }

  private reference(): ASTNode {
    const node = new ReferenceNode(this.currentToken);
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

  private returnStatement(): ReturnNode {
    const token = this.eat(TokenType.RESERVED_KEYWORD); // 'return'
    const expr = this.listExpr();
    return new ReturnNode(expr, token);
  }

  private whileStatement(): WhileNode {
    const whileToken = this.eat(TokenType.RESERVED_KEYWORD); // 'while'
    this.eat(TokenType.LPAREN);
    const condition = this.expr();
    this.eat(TokenType.RPAREN);
    const body = this.block();
    return new WhileNode(condition, body.statements as StatementListNode, whileToken);
  }

  private ifStatement(): IfNode {
    const ifToken = this.eat(TokenType.RESERVED_KEYWORD); // 'if'
    this.eat(TokenType.LPAREN);
    const condition = this.expr();
    this.eat(TokenType.RPAREN);
    const ifBody = this.block().statements as StatementListNode;
    let elseBody: StatementListNode | null = null;
    if (
      this.currentToken.type === TokenType.RESERVED_KEYWORD &&
      this.currentToken.value === ReservedKeyword.ELSE
    ) {
      this.eat(TokenType.RESERVED_KEYWORD); // 'else'
      elseBody = this.block().statements as StatementListNode;
    }
    return new IfNode(condition, ifBody, elseBody, ifToken);
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

    if (
      token.type === TokenType.OPERATION &&
      (token.value === Operations.ADD ||
        token.value === Operations.SUBTRACT ||
        token.value === Operations.LOGIC_NOT)
    ) {
      this.eat(TokenType.OPERATION);
      return new UnaryOpNode(token, this.factor());
    }

    if (
      token.type === TokenType.RESERVED_KEYWORD &&
      (token.value === ReservedKeyword.TRUE || token.value === ReservedKeyword.FALSE)
    ) {
      this.eat(TokenType.RESERVED_KEYWORD);
      return new BooleanNode(token.value === ReservedKeyword.TRUE, token);
    }

    if (token.type === TokenType.NUMBER) {
      return this.number();
    }

    if (token.type === TokenType.LPAREN) {
      this.eat(TokenType.LPAREN);
      const node = this.expr();
      this.eat(TokenType.RPAREN);
      if (this.currentToken.type === TokenType.FORMAT) {
        return this.format(node);
      }
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

    // Identifier or function call
    if (token.type === TokenType.STRING) {
      this.eat(TokenType.STRING);
      let node: ASTNode;
      // After `eat(STRING)`, currentToken is updated.
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
    this.error(`Unexpected token: ${String(token.value)}`);
  }

  private attributeAccess(leftNode: ASTNode): ASTNode {
    let node = leftNode;
    while (this.currentToken.type === TokenType.DOT) {
      this.eat(TokenType.DOT);
      // @ts-ignore - typescript bug with overlap?
      if (this.currentToken.type === TokenType.STRING) {
        const nextToken = this.lexer.peekToken();
        if (nextToken && nextToken.type === TokenType.LPAREN) {
          // It's a method call
          const methodName = this.currentToken.value as string;
          this.eat(TokenType.STRING);
          node = new AttributeAccessNode(
            node,
            this.functionCall({ ...this.currentToken, value: methodName } as Token),
          );
        } else {
          // It's a property access
          const attrToken = this.currentToken;
          this.eat(TokenType.STRING);
          node = new AttributeAccessNode(node, new IdentifierNode(attrToken));
        }
      }
    }
    return node;
  }

  private functionCall(functionName: Token): FunctionCallNode {
    this.eat(TokenType.LPAREN);
    const args: ASTNode[] = [];
    while (this.currentToken.type !== TokenType.RPAREN) {
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
      this.error("Unexpected token at the end of input.");
    }
    return node;
  }
}

export function parseExpression(text: string): {
  lexer: Lexer;
  parser: Parser;
  ast: ASTNode | null;
} {
  const lexer = new Lexer(text);
  const parser = new Parser(lexer);
  const ast = parser.parse();

  return {
    lexer,
    parser,
    ast,
  };
}
