import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { describe, it } from "vitest";

function showNode(node: any, indent = 0): void {
  const pad = '  '.repeat(indent);
  if (!node) {
    console.log(pad + 'null');
    return;
  }
  console.log(pad + node.nodeType);
  if (node.nodeType === 'BinOpNode') {
    console.log(pad + '  op:', node.opToken?.value);
    console.log(pad + '  left:');
    showNode(node.left, indent + 2);
    console.log(pad + '  right:');
    showNode(node.right, indent + 2);
  } else if (node.nodeType === 'NumberWithPossibleUnitNode') {
    console.log(pad + '  num:', node.numNode?.value, 'unit:', node.unitIdentifier);
  } else if (node.nodeType === 'NumNode') {
    console.log(pad + '  value:', node.value);
  } else if (node.nodeType === 'ElementWithUnitNode') {
    console.log(pad + '  value:', node.astNode?.value, 'unit:', node.unit);
  } else if (node.nodeType === 'ImplicitListNode' || node.nodeType === 'ListNode') {
    console.log(pad + '  elements:');
    for (const el of node.elements) {
      showNode(el, indent + 2);
    }
  }
}

function parseAndShow(expr: string) {
  const lexer = new Lexer(expr);
  const parser = new Parser(lexer);
  const ast = parser.parse(true);
  console.log('=== Expression:', JSON.stringify(expr), '===');
  showNode(ast);
  console.log('');
}

describe("Debug Parse", () => {
  it("shows AST for different expressions", () => {
    parseAndShow('3 s');
    parseAndShow('3s');
    parseAndShow('3s + 2s');
    parseAndShow('3px + 2px');
  });
});
