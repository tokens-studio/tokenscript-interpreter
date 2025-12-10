import type { ASTNode, Operations, SupportedFormats, Token, TokenType } from "@src/types";

// Re-export ASTNode for external consumers
export type { ASTNode } from "@src/types";

// Nodes -----------------------------------------------------------------------

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
  constructor(public token: Token) {
    if (this.token.value.includes(".")) {
      this.value = Number.parseFloat(this.token.value);
    } else {
      this.value = Number.parseInt(this.token.value, 10);
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

export class NullNode implements ASTNode {
  nodeType = "NullNode";
  constructor(public token?: Token) {}
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

export const attributesToString = (attrs: string[]): string => attrs.join(".");

export const identifiersChainToString = (attrs: IdentifierNode[]): string =>
  attributesToString(attrs.map((x) => x.name));

export class ReassignNode implements ASTNode {
  nodeType = "ReassignNode";
  constructor(
    public identifier: IdentifierNode | IdentifierNode[],
    public value: ASTNode,
    public token?: Token,
  ) {}
  baseIdentifier(): IdentifierNode {
    return Array.isArray(this.identifier) ? this.identifier[0] : this.identifier;
  }
  isAttributeAssignment(): boolean {
    return Array.isArray(this.identifier) && !!this.identifier[1];
  }
  identifierToString(): string {
    const parts = Array.isArray(this.identifier) ? this.identifier : [this.identifier];
    return identifiersChainToString(parts);
  }
  attributesChain(): IdentifierNode[] {
    if (Array.isArray(this.identifier)) {
      return this.identifier.slice(1);
    } else {
      return [];
    }
  }
  attributesStringChain(): string[] {
    return this.attributesChain().map((x) => x.name);
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

export class IfConditionNode implements ASTNode {
  nodeType = "IfConditionNode";
  constructor(
    public condition: ASTNode,
    public body: StatementListNode,
    public token?: Token,
  ) {}
}

export class IfNode implements ASTNode {
  nodeType = "IfNode";
  constructor(
    public conditions: IfConditionNode[],
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

// Utilities -------------------------------------------------------------------

/**
 * Walk the AST and call the visit function on each node
 *
 * @param node - The AST node to traverse
 * @param onVisit - Function called for each node during traversal
 *
 * @example
 * // Print all node types
 * walk(ast, (node) => console.log(node.nodeType));
 *
 * @example
 * // Collect all reference nodes
 * const refs: ReferenceNode[] = [];
 * walk(ast, (node) => {
 *   if (node instanceof ReferenceNode) refs.push(node);
 * });
 */
export function walkAst(node: ASTNode, onVisit: (node: ASTNode) => void): void {
  onVisit(node);

  if (node instanceof BinOpNode) {
    walkAst(node.left, onVisit);
    walkAst(node.right, onVisit);
  } else if (node instanceof UnaryOpNode) {
    walkAst(node.expr, onVisit);
  } else if (node instanceof ListNode || node instanceof ImplicitListNode) {
    for (const element of node.elements) {
      walkAst(element, onVisit);
    }
  } else if (node instanceof FunctionCallNode) {
    for (const arg of node.args) {
      walkAst(arg, onVisit);
    }
  } else if (node instanceof ElementWithUnitNode) {
    walkAst(node.astNode, onVisit);
  } else if (node instanceof AssignNode) {
    if (node.assignmentExpr) {
      walkAst(node.assignmentExpr, onVisit);
    }
  } else if (node instanceof ReassignNode) {
    walkAst(node.value, onVisit);
  } else if (node instanceof ReturnNode) {
    walkAst(node.expr, onVisit);
  } else if (node instanceof WhileNode) {
    walkAst(node.condition, onVisit);
    walkAst(node.body, onVisit);
  } else if (node instanceof IfConditionNode) {
    walkAst(node.condition, onVisit);
    walkAst(node.body, onVisit);
  } else if (node instanceof IfNode) {
    for (const condition of node.conditions) {
      walkAst(condition, onVisit);
    }
    if (node.elseBody) {
      walkAst(node.elseBody, onVisit);
    }
  } else if (node instanceof BlockNode) {
    walkAst(node.statements, onVisit);
  } else if (node instanceof StatementListNode) {
    for (const statement of node.statements) {
      walkAst(statement, onVisit);
    }
  } else if (node instanceof AttributeAccessNode) {
    walkAst(node.left, onVisit);
    if (node.right instanceof FunctionCallNode) {
      walkAst(node.right, onVisit);
    }
  }
}

/**
 * Walk the AST and collect all nodes that match the predicate into a flat list
 *
 * @param ast - The AST node to traverse
 * @param predicate - Function to test each node
 * @returns Flat array of matching nodes
 *
 * @example
 * // Find all reference nodes
 * const refs = filterAST(ast, (node) => node instanceof ReferenceNode);
 *
 * @example
 * // Find references to a specific token
 * const refs = filterAST(ast, (node) =>
 *   node instanceof ReferenceNode && node.value === "color.primary"
 * );
 */
export function filterAST<T extends ASTNode>(
  ast: ASTNode,
  predicate: (node: ASTNode) => boolean,
): T[] {
  const results: T[] = [];
  walkAst(ast, (node) => {
    if (predicate(node)) {
      results.push(node as T);
    }
  });
  return results;
}

/**
 * Collect all reference nodes from the AST
 *
 * @param ast - The AST node to traverse
 * @param targetName - Optional: only collect references matching this name
 * @returns Array of reference nodes
 *
 * @example
 * // Get all references
 * const refs = collectReferenceNodes(ast);
 *
 * @example
 * // Get references to a specific token
 * const refs = collectReferenceNodes(ast, "color.primary");
 */
export function collectReferenceNodes(ast: ASTNode, targetName?: string): ReferenceNode[] {
  if (targetName) {
    return filterAST<ReferenceNode>(
      ast,
      (node) => node instanceof ReferenceNode && node.value === targetName,
    );
  }
  return filterAST<ReferenceNode>(ast, (node) => node instanceof ReferenceNode);
}
