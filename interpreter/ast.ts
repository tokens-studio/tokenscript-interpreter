import type { ASTNode, Operations, SupportedFormats, Token, TokenType } from "../types";

// Re-export ASTNode for external consumers
export type { ASTNode } from "../types";

export class BinOpNode implements ASTNode {
  nodeType = "BinOpNode";
  constructor(
    public left: ASTNode,
    public opToken: Token,
    public right: ASTNode,
    public token?: Token,
  ) {
    this.token = opToken;
  }
  get op(): Operations | TokenType {
    return this.opToken.value as Operations | TokenType;
  }
}

export class NumNode implements ASTNode {
  nodeType = "NumNode";
  public value: number;
  public isFloat: boolean;
  constructor(public token: Token) {
    if (this.token.value.includes(".")) {
      this.value = Number.parseFloat(this.token.value);
      this.isFloat = true;
    } else {
      this.value = Number.parseInt(this.token.value, 10);
      this.isFloat = false;
    }
  }
}

export class StringNode implements ASTNode {
  nodeType = "StringNode";
  public value: string;
  constructor(public token: Token) {
    this.value = token.value;
  }
}

export class UnaryOpNode implements ASTNode {
  nodeType = "UnaryOpNode";
  constructor(
    public opToken: Token,
    public expr: ASTNode,
    public token?: Token,
  ) {
    this.token = opToken;
  }
  get op(): Operations {
    return this.opToken.value as Operations;
  }
}

export class ListNode implements ASTNode {
  nodeType = "ListNode";
  constructor(
    public elements: ASTNode[],
    public token?: Token,
  ) {}
}

export class ImplicitListNode extends ListNode {
  override nodeType = "ImplicitListNode";
  public isImplicit = true;
  constructor(
    public elements: ASTNode[],
    public token?: Token,
  ) {
    super(elements, token);
  }
}

export class FunctionCallNode implements ASTNode {
  nodeType = "FunctionCallNode";
  public name: string;
  constructor(
    nameTokenValue: string,
    public args: ASTNode[],
    public token?: Token,
  ) {
    this.name = nameTokenValue;
  }
}

export class NoOpNode implements ASTNode {
  nodeType = "NoOpNode";
  constructor(public token?: Token) {}
}

export class ReferenceNode implements ASTNode {
  nodeType = "ReferenceNode";
  public value: string;
  constructor(public token: Token) {
    this.value = token.value;
  }
}

export class IdentifierNode implements ASTNode {
  nodeType = "IdentifierNode";
  public name: string;
  constructor(public token: Token) {
    this.name = token.value;
  }
}

export class HexColorNode implements ASTNode {
  nodeType = "HexColorNode";
  public value: string;
  constructor(public token: Token) {
    this.value = token.value;
  }
}

export class BooleanNode implements ASTNode {
  nodeType = "BooleanNode";
  constructor(
    public value: boolean,
    public token?: Token,
  ) {}
}

export class ElementWithUnitNode implements ASTNode {
  nodeType = "ElementWithUnitNode";
  public unit: SupportedFormats;
  constructor(
    public astNode: ASTNode,
    unitTokenValue: SupportedFormats,
    public token?: Token,
  ) {
    this.unit = unitTokenValue;
  }
}

export class AssignNode implements ASTNode {
  nodeType = "AssignNode";
  constructor(
    public varName: IdentifierNode,
    public typeDecl: TypeDeclNode, // Represents the full type string like 'Color.RGB' or 'String'
    public assignmentExpr: ASTNode | null, // Null if no assignment
    public token?: Token,
  ) {}
}

export class TypeDeclNode implements ASTNode {
  nodeType = "TypeDeclNode";
  // baseType: e.g. "Color", "List"
  // subTypes: e.g. ["RGB"] for "Color.RGB", or ["String"] for "List.String" (hypothetical)
  constructor(
    public baseType: IdentifierNode,
    public subTypes: IdentifierNode[],
    public token?: Token,
  ) {}

  name(): string {
    let typeStr = this.baseType.name;
    if (this.subTypes.length > 0) {
      typeStr += `.${this.subTypes.map((s) => s.name).join(".")}`;
    }
    return typeStr;
  }
}

export class AttributeAssignNode implements ASTNode {
  nodeType = "AttributeAssignNode";
  constructor(
    public objectIdentifier: IdentifierNode,
    public attributes: IdentifierNode[],
    public value: ASTNode,
    public token?: Token,
  ) {}
}

export class ReassignNode implements ASTNode {
  nodeType = "ReassignNode";
  constructor(
    public identifier: IdentifierNode | IdentifierNode[],
    public value: ASTNode,
    public token?: Token,
  ) {}
  baseIdentifier() {
    return Array.isArray(this.identifier) ? this.identifier[0] : this.identifier;
  }
  identifierToString() {
    const parts = Array.isArray(this.identifier) ? this.identifier : [this.identifier];
    return parts.map(x => x.name).join(".");
  }
}

export class ReturnNode implements ASTNode {
  nodeType = "ReturnNode";
  constructor(
    public expr: ASTNode,
    public token?: Token,
  ) {}
}

export class WhileNode implements ASTNode {
  nodeType = "WhileNode";
  constructor(
    public condition: ASTNode,
    public body: StatementListNode,
    public token?: Token,
  ) {}
}

export class IfNode implements ASTNode {
  nodeType = "IfNode";
  constructor(
    public condition: ASTNode,
    public ifBody: StatementListNode,
    public elseBody: StatementListNode | null,
    public token?: Token,
  ) {}
}

export class BlockNode implements ASTNode {
  // Represents the [...] block
  nodeType = "BlockNode";
  constructor(
    public statements: StatementListNode,
    public token?: Token,
  ) {}
}

export class StatementListNode implements ASTNode {
  nodeType = "StatementListNode";
  constructor(
    public statements: ASTNode[],
    public token?: Token,
  ) {}
}

export class AttributeAccessNode implements ASTNode {
  nodeType = "AttributeAccessNode";
  // 'left' is the object, 'right' is the attribute (IdentifierNode) or method (FunctionCallNode)
  constructor(
    public left: ASTNode,
    public right: IdentifierNode | FunctionCallNode,
    public token?: Token,
  ) {}
}
