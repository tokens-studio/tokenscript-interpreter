import {
  type ASTNode,
  Operations,
  ReservedKeyword,
  type Token,
  TokenType,
} from "../types";
import {
  AssignNode,
  AttributeAccessNode,
  AttributeAssignNode,
  BinOpNode,
  BlockNode,
  BooleanNode,
  ElementWithUnitNode,
  FunctionNode,
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
import type { Lexer } from "./lexer";

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  public requiredReferences: Set<string> = new Set();

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = this.lexer.nextToken();
  }

  public getRequiredReferences(): string[] {
    return Array.from(this.requiredReferences);
  }

  private error(message = "Invalid syntax"): never {
    throw new ParserError(message, this.currentToken?.line, this.currentToken);
  }

  private eat(tokenType: TokenType): Token {
    const eatenToken = this.currentToken;
    if (this.currentToken.type === tokenType) {
      this.currentToken = this.lexer.nextToken();
    } else {
      this.error(
        `Expected token type ${tokenType} but got ${this.currentToken.type}`,
      );
    }
    return eatenToken;
  }

  public parse(inlineMode = false): ASTNode | null {
    if (this.currentToken.type === TokenType.EOF) return null;

    if (inlineMode) return this.listExpr();

    const node = this.statementList();
    if ((this.currentToken.type as TokenType) !== TokenType.EOF) {
      this.error("Unexpected token at the end of input.");
    }
    return node;
  }

  private statementList(): StatementListNode {
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
          return this.assignDeclaration();
      }
    }

    if (this.currentToken.type === TokenType.STRING) {
      const nextToken = this.lexer.peekToken();
      if (nextToken && nextToken.type === TokenType.ASSIGN) {
        return this.reassignStatement();
      }
      // TODO: Handle attribute assignment (ident.ident = ...)
    }

    return this.listExpr();
  }

  private assignDeclaration(): AssignNode {
    const varToken = this.eat(TokenType.RESERVED_KEYWORD); // 'variable'
    const varNameToken = this.eat(TokenType.STRING);
    const varName = new IdentifierNode(varNameToken);
    this.eat(TokenType.COLON);

    const typeDecl = this.typeDeclaration();

    let assignmentExpr: ASTNode | null = null;
    if (this.currentToken.type === TokenType.ASSIGN) {
      this.eat(TokenType.ASSIGN);
      assignmentExpr = this.listExpr();
    }
    return new AssignNode(varName, typeDecl, assignmentExpr, varToken);
  }

  private reassignStatement(): ReassignNode {
    const identifierToken = this.eat(TokenType.STRING);
    const identifier = new IdentifierNode(identifierToken);
    this.eat(TokenType.ASSIGN);
    const value = this.listExpr();
    return new ReassignNode(identifier, value, identifierToken);
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

  private attributeAssignment(): AttributeAssignNode {
    // Grammar: ident ("." ident)* "=" ListExpr
    // This is simplified due to lack of multi-token lookahead.
    // A full implementation requires parsing the identifier chain first.
    const objectIdentifierToken = this.eat(TokenType.STRING); // Assuming STRING is for ident
    const objectIdentifier = new IdentifierNode(objectIdentifierToken);
    const _attributes: IdentifierNode[] = [];

    // This part is tricky without proper lookahead.
    // We're currently in statement() which calls listExpr(), which might consume attributes.
    // This needs a more robust parsing strategy for assignments.
    // For now, this is a placeholder for the structure.
    this.error(
      "Attribute assignment parsing is complex and not fully implemented with current lookahead.",
    );
    // Pseudocode for what should happen:
    // while (this.currentToken.type === TokenType.DOT) {
    //   this.eat(TokenType.DOT);
    //   const attrToken = this.eat(TokenType.STRING);
    //   attributes.push(new IdentifierNode(attrToken));
    // }
    // this.eat(TokenType.ASSIGN);
    // const value = this.listExpr();
    // return new AttributeAssignNode(objectIdentifier, attributes, value, objectIdentifierToken);
    return new AttributeAssignNode(
      objectIdentifier,
      [],
      new StringNode({ type: TokenType.STRING, value: "dummy", line: 0 }),
      objectIdentifierToken,
    ); // Placeholder
  }

  private returnStatement(): ReturnNode {
    const returnToken = this.eat(TokenType.RESERVED_KEYWORD); // 'return'
    const expr = this.listExpr(); // Changed from this.expr() to this.listExpr() to support implicit lists
    // Semicolon is optional in the grammar, handled by statementList expecting SEMICOLON
    return new ReturnNode(expr, returnToken);
  }

  private whileStatement(): WhileNode {
    const whileToken = this.eat(TokenType.RESERVED_KEYWORD); // 'while'
    this.eat(TokenType.LPAREN);
    const condition = this.expr();
    this.eat(TokenType.RPAREN);
    const body = this.block();
    return new WhileNode(
      condition,
      body.statements as StatementListNode,
      whileToken,
    );
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
    const statements = this.statementList();
    this.eat(TokenType.RBLOCK);
    return new BlockNode(statements);
  }

  private listExpr(): ASTNode {
    const firstToken = this.currentToken;
    const elements: ASTNode[] = [this.implicitList()];
    while (this.currentToken.type === TokenType.COMMA) {
      this.eat(TokenType.COMMA);
      elements.push(this.implicitList());
    }
    if (elements.length === 1) return elements[0];
    return new ListNode(elements, firstToken);
  }

  // ImplicitList = Expr+
  private implicitList(): ASTNode {
    const firstToken = this.currentToken;
    const elements: ASTNode[] = [this.expr()];
    while (
      this.currentToken.type !== TokenType.COMMA &&
      this.currentToken.type !== TokenType.RPAREN && // End of function args
      this.currentToken.type !== TokenType.RBLOCK && // End of block
      this.currentToken.type !== TokenType.SEMICOLON &&
      this.currentToken.type !== TokenType.EOF
    ) {
      // This condition ensures we only consume tokens that can be part of an implicit list element
      // e.g. `10px 5em` vs `10px, 5em`
      // We need to ensure we don't accidentally consume operators that belong to the next Expr in a ListExpr
      // A simple check: if it's not an operator that would start a new term, it's part of current implicit list.
      // This is a simplification. A more robust check would consider operator precedence.
      elements.push(this.expr());
    }
    if (elements.length === 1) return elements[0];
    return new ImplicitListNode(elements, firstToken);
  }

  // Expr = LogicTerm (("&&" | "||") LogicTerm)*
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

  // LogicTerm = Comparison (("+" | "-") Comparison)*
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

  // Comparison = Term (("==" | "!=" | ">" | "<" | ">=" | "<=") Term)*
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

  // Power = Factor ("^" Factor)*
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

  // Factor = UnaryOp | NumberLit | ParenExpr | Reference | Identifier | StringLit | HexColor | Boolean
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
    if (token.type === TokenType.NUMBER) {
      this.eat(TokenType.NUMBER);
      let node: ASTNode = new NumNode(token);
      if (this.currentToken.type === TokenType.FORMAT) {
        const formatToken = this.eat(TokenType.FORMAT);
        node = new ElementWithUnitNode(node, formatToken.value);
      }
      return node;
    }
    if (token.type === TokenType.LPAREN) {
      this.eat(TokenType.LPAREN);
      let node = this.expr();
      this.eat(TokenType.RPAREN);
      if (this.currentToken.type === TokenType.FORMAT) {
        const formatToken = this.eat(TokenType.FORMAT);
        node = new ElementWithUnitNode(node, formatToken.value);
      }
      return node;
    }
    if (token.type === TokenType.REFERENCE) {
      this.eat(TokenType.REFERENCE);
      this.requiredReferences.add(token.value as string);
      let node: ASTNode = new ReferenceNode(token);
      if (this.currentToken.type === TokenType.FORMAT) {
        // e.g. {size}px
        const formatToken = this.eat(TokenType.FORMAT);
        node = new ElementWithUnitNode(node, formatToken.value);
      }
      // Handle attribute access like {ref}.property or {ref}.method()
      node = this.parseAttributeAccess(node);
      return node;
    }
    if (token.type === TokenType.STRING) {
      // Identifier or function call
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
      node = this.parseAttributeAccess(node);
      return node;
    }
    if (token.type === TokenType.EXPLICIT_STRING) {
      this.eat(TokenType.EXPLICIT_STRING);
      let node: ASTNode = new StringNode(token);
      node = this.parseAttributeAccess(node); // For string methods like "hello".length()
      return node;
    }
    if (token.type === TokenType.HEX_COLOR) {
      this.eat(TokenType.HEX_COLOR);
      return new HexColorNode(token);
    }
    if (
      token.type === TokenType.RESERVED_KEYWORD &&
      (token.value === ReservedKeyword.TRUE ||
        token.value === ReservedKeyword.FALSE)
    ) {
      this.eat(TokenType.RESERVED_KEYWORD);
      return new BooleanNode(token.value === ReservedKeyword.TRUE, token);
    }
    this.error(
      `Unexpected token in factor: ${token.type} (${String(token.value)})`,
    );
    return new StringNode({ type: TokenType.STRING, value: "dummy", line: 0 }); // Should be unreachable
  }

  private parseAttributeAccess(leftNode: ASTNode): ASTNode {
    let node = leftNode;
    while (this.currentToken.type === TokenType.DOT) {
      this.eat(TokenType.DOT);
      const attrNameToken = this.eat(TokenType.STRING);
      // After `eat(STRING)`, currentToken is updated.
      // This comparison (this.currentToken.type as TokenType) === TokenType.LPAREN is valid.
      if ((this.currentToken.type as TokenType) === TokenType.LPAREN) {
        // Method call
        const methodNode = this.functionCall(attrNameToken);
        node = new AttributeAccessNode(node, methodNode);
      } else {
        // Property access
        node = new AttributeAccessNode(node, new IdentifierNode(attrNameToken));
      }
    }
    return node;
  }

  private functionCall(nameToken: Token): FunctionNode {
    // LPAREN is already checked before calling this
    this.eat(TokenType.LPAREN);
    const args: ASTNode[] = [];
    if (this.currentToken.type !== TokenType.RPAREN) {
      // Parse comma-separated arguments
      args.push(this.implicitList()); // First argument
      while (this.currentToken.type === TokenType.COMMA) {
        this.eat(TokenType.COMMA);
        args.push(this.implicitList()); // Additional arguments
      }
    }
    this.eat(TokenType.RPAREN);
    return new FunctionNode(nameToken.value as string, args, nameToken);
  }
}
