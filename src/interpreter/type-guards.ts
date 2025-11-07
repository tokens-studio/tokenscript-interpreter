import type { ASTNode } from "@src/types";
import type {
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
  NoOpNode,
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

/**
 * Type guard to check if an AST node is a BinOpNode
 * @example
 * if (isBinOpNode(node)) {
 *   console.log(node.left, node.right);
 * }
 */
export function isBinOpNode(node: ASTNode): node is BinOpNode {
  return node.nodeType === "BinOpNode";
}

/**
 * Type guard to check if an AST node is a NumNode
 * @example
 * if (isNumNode(node)) {
 *   console.log(node.value);
 * }
 */
export function isNumNode(node: ASTNode): node is NumNode {
  return node.nodeType === "NumNode";
}

/**
 * Type guard to check if an AST node is a StringNode
 * @example
 * if (isStringNode(node)) {
 *   console.log(node.value);
 * }
 */
export function isStringNode(node: ASTNode): node is StringNode {
  return node.nodeType === "StringNode";
}

/**
 * Type guard to check if an AST node is a UnaryOpNode
 * @example
 * if (isUnaryOpNode(node)) {
 *   console.log(node.op, node.expr);
 * }
 */
export function isUnaryOpNode(node: ASTNode): node is UnaryOpNode {
  return node.nodeType === "UnaryOpNode";
}

/**
 * Type guard to check if an AST node is a ListNode
 * @example
 * if (isListNode(node)) {
 *   console.log(node.elements);
 * }
 */
export function isListNode(node: ASTNode): node is ListNode {
  return node.nodeType === "ListNode";
}

/**
 * Type guard to check if an AST node is an ImplicitListNode
 * @example
 * if (isImplicitListNode(node)) {
 *   console.log(node.elements, node.isImplicit);
 * }
 */
export function isImplicitListNode(node: ASTNode): node is ImplicitListNode {
  return node.nodeType === "ImplicitListNode";
}

/**
 * Type guard to check if an AST node is a FunctionCallNode
 * @example
 * if (isFunctionCallNode(node)) {
 *   console.log(node.name, node.args);
 * }
 */
export function isFunctionCallNode(node: ASTNode): node is FunctionCallNode {
  return node.nodeType === "FunctionCallNode";
}

/**
 * Type guard to check if an AST node is a ReferenceNode
 * @example
 * if (isReferenceNode(node)) {
 *   console.log(node.value);
 * }
 */
export function isReferenceNode(node: ASTNode): node is ReferenceNode {
  return node.nodeType === "ReferenceNode";
}

/**
 * Type guard to check if an AST node is an IdentifierNode
 * @example
 * if (isIdentifierNode(node)) {
 *   console.log(node.name);
 * }
 */
export function isIdentifierNode(node: ASTNode): node is IdentifierNode {
  return node.nodeType === "IdentifierNode";
}

/**
 * Type guard to check if an AST node is a HexColorNode
 * @example
 * if (isHexColorNode(node)) {
 *   console.log(node.value);
 * }
 */
export function isHexColorNode(node: ASTNode): node is HexColorNode {
  return node.nodeType === "HexColorNode";
}

/**
 * Type guard to check if an AST node is a BooleanNode
 * @example
 * if (isBooleanNode(node)) {
 *   console.log(node.value);
 * }
 */
export function isBooleanNode(node: ASTNode): node is BooleanNode {
  return node.nodeType === "BooleanNode";
}

/**
 * Type guard to check if an AST node is a NullNode
 * @example
 * if (isNullNode(node)) {
 *   // Handle null value
 * }
 */
export function isNullNode(node: ASTNode): node is NullNode {
  return node.nodeType === "NullNode";
}

/**
 * Type guard to check if an AST node is a NoOpNode
 * @example
 * if (isNoOpNode(node)) {
 *   // Handle no-operation node
 * }
 */
export function isNoOpNode(node: ASTNode): node is NoOpNode {
  return node.nodeType === "NoOpNode";
}

/**
 * Type guard to check if an AST node is an ElementWithUnitNode
 * @example
 * if (isElementWithUnitNode(node)) {
 *   console.log(node.astNode, node.unit);
 * }
 */
export function isElementWithUnitNode(node: ASTNode): node is ElementWithUnitNode {
  return node.nodeType === "ElementWithUnitNode";
}

/**
 * Type guard to check if an AST node is an AssignNode
 * @example
 * if (isAssignNode(node)) {
 *   console.log(node.varName, node.typeDecl, node.assignmentExpr);
 * }
 */
export function isAssignNode(node: ASTNode): node is AssignNode {
  return node.nodeType === "AssignNode";
}

/**
 * Type guard to check if an AST node is a TypeDeclNode
 * @example
 * if (isTypeDeclNode(node)) {
 *   console.log(node.baseType, node.subTypes);
 * }
 */
export function isTypeDeclNode(node: ASTNode): node is TypeDeclNode {
  return node.nodeType === "TypeDeclNode";
}

/**
 * Type guard to check if an AST node is a ReassignNode
 * @example
 * if (isReassignNode(node)) {
 *   console.log(node.identifier, node.value);
 * }
 */
export function isReassignNode(node: ASTNode): node is ReassignNode {
  return node.nodeType === "ReassignNode";
}

/**
 * Type guard to check if an AST node is a ReturnNode
 * @example
 * if (isReturnNode(node)) {
 *   console.log(node.expr);
 * }
 */
export function isReturnNode(node: ASTNode): node is ReturnNode {
  return node.nodeType === "ReturnNode";
}

/**
 * Type guard to check if an AST node is a WhileNode
 * @example
 * if (isWhileNode(node)) {
 *   console.log(node.condition, node.body);
 * }
 */
export function isWhileNode(node: ASTNode): node is WhileNode {
  return node.nodeType === "WhileNode";
}

/**
 * Type guard to check if an AST node is an IfConditionNode
 * @example
 * if (isIfConditionNode(node)) {
 *   console.log(node.condition, node.body);
 * }
 */
export function isIfConditionNode(node: ASTNode): node is IfConditionNode {
  return node.nodeType === "IfConditionNode";
}

/**
 * Type guard to check if an AST node is an IfNode
 * @example
 * if (isIfNode(node)) {
 *   console.log(node.conditions, node.elseBody);
 * }
 */
export function isIfNode(node: ASTNode): node is IfNode {
  return node.nodeType === "IfNode";
}

/**
 * Type guard to check if an AST node is a BlockNode
 * @example
 * if (isBlockNode(node)) {
 *   console.log(node.statements);
 * }
 */
export function isBlockNode(node: ASTNode): node is BlockNode {
  return node.nodeType === "BlockNode";
}

/**
 * Type guard to check if an AST node is a StatementListNode
 * @example
 * if (isStatementListNode(node)) {
 *   console.log(node.statements);
 * }
 */
export function isStatementListNode(node: ASTNode): node is StatementListNode {
  return node.nodeType === "StatementListNode";
}

/**
 * Type guard to check if an AST node is an AttributeAccessNode
 * @example
 * if (isAttributeAccessNode(node)) {
 *   console.log(node.left, node.right);
 * }
 */
export function isAttributeAccessNode(node: ASTNode): node is AttributeAccessNode {
  return node.nodeType === "AttributeAccessNode";
}

/**
 * Helper function to narrow AST node types using a switch statement on nodeType.
 * This provides exhaustive type checking and ensures all node types are handled.
 * 
 * @example
 * const result = matchASTNode(node, {
 *   NumNode: (n) => n.value * 2,
 *   StringNode: (s) => s.value.toUpperCase(),
 *   BinOpNode: (b) => `${b.left} ${b.op} ${b.right}`,
 *   // ... other cases
 * });
 */
export type ASTNodeMatcher<T> = {
  BinOpNode?: (node: BinOpNode) => T;
  NumNode?: (node: NumNode) => T;
  StringNode?: (node: StringNode) => T;
  UnaryOpNode?: (node: UnaryOpNode) => T;
  ListNode?: (node: ListNode) => T;
  ImplicitListNode?: (node: ImplicitListNode) => T;
  FunctionCallNode?: (node: FunctionCallNode) => T;
  ReferenceNode?: (node: ReferenceNode) => T;
  IdentifierNode?: (node: IdentifierNode) => T;
  HexColorNode?: (node: HexColorNode) => T;
  BooleanNode?: (node: BooleanNode) => T;
  NullNode?: (node: NullNode) => T;
  ElementWithUnitNode?: (node: ElementWithUnitNode) => T;
  AssignNode?: (node: AssignNode) => T;
  TypeDeclNode?: (node: TypeDeclNode) => T;
  ReassignNode?: (node: ReassignNode) => T;
  ReturnNode?: (node: ReturnNode) => T;
  WhileNode?: (node: WhileNode) => T;
  IfConditionNode?: (node: IfConditionNode) => T;
  IfNode?: (node: IfNode) => T;
  BlockNode?: (node: BlockNode) => T;
  StatementListNode?: (node: StatementListNode) => T;
  AttributeAccessNode?: (node: AttributeAccessNode) => T;
  NoOpNode?: (node: NoOpNode) => T;
  default?: (node: ASTNode) => T;
};

/**
 * Pattern matching helper for AST nodes.
 * Provides a type-safe way to handle different AST node types.
 * 
 * @param node - The AST node to match against
 * @param matcher - An object with handler functions for each node type
 * @returns The result from the matching handler function
 * 
 * @example
 * const result = matchASTNode(astNode, {
 *   NumNode: (n) => `Number: ${n.value}`,
 *   StringNode: (s) => `String: ${s.value}`,
 *   BinOpNode: (b) => `Binary operation`,
 *   default: (n) => `Unknown node type: ${n.nodeType}`
 * });
 */
export function matchASTNode<T>(node: ASTNode, matcher: ASTNodeMatcher<T>): T | undefined {
  const nodeType = node.nodeType as keyof Omit<ASTNodeMatcher<T>, 'default'>;
  const handler = matcher[nodeType];
  if (handler) {
    // The handler is typed to accept the specific node type corresponding to nodeType,
    // so this call is type-safe even though we use a type assertion
    return (handler as (n: ASTNode) => T)(node);
  }
  return matcher.default?.(node);
}
