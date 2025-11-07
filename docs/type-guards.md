# AST Type Guards for Parser Results

This document provides examples and guidance for using the static type guards available for AST (Abstract Syntax Tree) node types returned by the parser.

## Overview

The tokenscript-interpreter now includes comprehensive type guard functions that enable type-safe handling of AST nodes. These guards allow you to narrow TypeScript types and perform custom functionality based on the specific node type returned by the parser.

## Basic Usage

### Importing Type Guards

```typescript
import { 
  parseExpression,
  isNumNode,
  isStringNode,
  isBinOpNode,
  isFunctionCallNode,
  isReferenceNode
} from '@tokens-studio/tokenscript-interpreter';
```

### Simple Type Checking

```typescript
const { ast } = parseExpression("42");

if (ast && isNumNode(ast)) {
  // TypeScript now knows ast is a NumNode
  console.log(`Number value: ${ast.value}`);
}
```

### Working with Binary Operations

```typescript
const { ast } = parseExpression("1 + 2");

if (ast && isBinOpNode(ast)) {
  // TypeScript knows the structure of BinOpNode
  console.log(`Operation: ${ast.op}`);
  
  if (isNumNode(ast.left) && isNumNode(ast.right)) {
    console.log(`${ast.left.value} ${ast.op} ${ast.right.value}`);
  }
}
```

## Available Type Guards

All type guards follow the naming pattern `is{NodeType}` and return a boolean that acts as a type predicate.

### Value Nodes
- `isNumNode(node)` - Numbers (42, 3.14)
- `isStringNode(node)` - Explicit strings ("hello")
- `isBooleanNode(node)` - Boolean values (true, false)
- `isNullNode(node)` - Null values
- `isHexColorNode(node)` - Hex color values (#ff6b35)

### Expression Nodes
- `isBinOpNode(node)` - Binary operations (1 + 2, 3 * 4)
- `isUnaryOpNode(node)` - Unary operations (-5, !true)
- `isListNode(node)` - Explicit lists (1, 2, 3)
- `isImplicitListNode(node)` - Implicit lists (1 2 3px)

### Advanced Usage Examples

See the full documentation for advanced examples including:
- Pattern matching with `matchASTNode`
- Recursive AST traversal
- AST transformation
- Custom evaluators
- Code generation

## Best Practices

1. Always check for null before using type guards
2. Use pattern matching for complex logic
3. Combine guards for complex predicates
4. Leverage TypeScript's type narrowing

For complete examples and advanced usage, see the tests in `tests/interpreter/type-guards.test.ts`.

## Quick Start Examples

### Example 1: Type-Safe AST Visitor

```typescript
import { parseExpression, isNumNode, isBinOpNode, type ASTNode } from '@tokens-studio/tokenscript-interpreter';

function evaluate(node: ASTNode): number {
  if (isNumNode(node)) {
    return node.value;
  }
  
  if (isBinOpNode(node)) {
    const left = evaluate(node.left);
    const right = evaluate(node.right);
    
    switch (node.op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      default: throw new Error(`Unknown operator: ${node.op}`);
    }
  }
  
  throw new Error(`Cannot evaluate node type: ${node.nodeType}`);
}

const { ast } = parseExpression("(5 + 3) * 2");
console.log(evaluate(ast!)); // Output: 16
```

### Example 2: Pattern Matching

```typescript
import { parseExpression, matchASTNode } from '@tokens-studio/tokenscript-interpreter';

const { ast } = parseExpression("42 + 10");

const description = matchASTNode(ast!, {
  NumNode: (n) => `Number: ${n.value}`,
  StringNode: (s) => `String: ${s.value}`,
  BinOpNode: (b) => `Binary operation: ${b.op}`,
  FunctionCallNode: (f) => `Function: ${f.name}`,
  default: (node) => `Unknown: ${node.nodeType}`
});

console.log(description); // Output: "Binary operation: +"
```

### Example 3: Finding References

```typescript
import { 
  parseExpression, 
  isReferenceNode,
  isBinOpNode,
  type ASTNode 
} from '@tokens-studio/tokenscript-interpreter';

function findReferences(node: ASTNode): string[] {
  const refs: string[] = [];
  
  if (isReferenceNode(node)) {
    refs.push(node.value);
  } else if (isBinOpNode(node)) {
    refs.push(...findReferences(node.left));
    refs.push(...findReferences(node.right));
  }
  
  return refs;
}

const { ast } = parseExpression("{primary} + {secondary} * 2");
console.log(findReferences(ast!)); // Output: ["primary", "secondary"]
```

## All Available Type Guards

- **Value Nodes**: `isNumNode`, `isStringNode`, `isBooleanNode`, `isNullNode`, `isHexColorNode`
- **Expression Nodes**: `isBinOpNode`, `isUnaryOpNode`, `isListNode`, `isImplicitListNode`
- **Reference Nodes**: `isReferenceNode`, `isIdentifierNode`, `isAttributeAccessNode`
- **Function Nodes**: `isFunctionCallNode`, `isElementWithUnitNode`
- **Control Flow**: `isIfNode`, `isIfConditionNode`, `isWhileNode`, `isReturnNode`, `isStatementListNode`
- **Declarations**: `isAssignNode`, `isReassignNode`, `isTypeDeclNode`, `isBlockNode`

## Additional Resources

- Full test suite: `tests/interpreter/type-guards.test.ts`
- AST Node definitions: `src/interpreter/ast.ts`
- Type guard implementations: `src/interpreter/type-guards.ts`
