import { Parser } from "@interpreter/parser";
import {
  isAssignNode,
  isAttributeAccessNode,
  isBinOpNode,
  isBooleanNode,
  isElementWithUnitNode,
  isFunctionCallNode,
  isHexColorNode,
  isIdentifierNode,
  isIfConditionNode,
  isIfNode,
  isImplicitListNode,
  isListNode,
  isNoOpNode,
  isNullNode,
  isNumNode,
  isReassignNode,
  isReferenceNode,
  isReturnNode,
  isStatementListNode,
  isStringNode,
  isTypeDeclNode,
  isUnaryOpNode,
  isWhileNode,
  matchASTNode,
} from "@interpreter/type-guards";
import { Lexer } from "@interpreter/lexer";
import { NoOpNode } from "@interpreter/ast";
import { describe, expect, it } from "vitest";

describe("AST Type Guards", () => {
  const parseExpression = (expression: string) => {
    const lexer = new Lexer(expression);
    const parser = new Parser(lexer);
    return parser.parse(true); // inline mode
  };

  const parseStatement = (code: string) => {
    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    return parser.parse(false);
  };

  describe("isNumNode", () => {
    it("should identify number nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isNumNode(ast!)).toBe(true);
      if (isNumNode(ast!)) {
        expect(ast.value).toBe(42);
      }
    });

    it("should identify decimal number nodes", () => {
      const ast = parseExpression("3.14");
      expect(ast).not.toBeNull();
      expect(isNumNode(ast!)).toBe(true);
      if (isNumNode(ast!)) {
        expect(ast.value).toBeCloseTo(3.14);
      }
    });

    it("should return false for non-number nodes", () => {
      const ast = parseExpression('"hello"');
      expect(ast).not.toBeNull();
      expect(isNumNode(ast!)).toBe(false);
    });
  });

  describe("isStringNode", () => {
    it("should identify string nodes", () => {
      const ast = parseExpression('"hello world"');
      expect(ast).not.toBeNull();
      expect(isStringNode(ast!)).toBe(true);
      if (isStringNode(ast!)) {
        expect(ast.value).toBe("hello world");
      }
    });

    it("should return false for non-string nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isStringNode(ast!)).toBe(false);
    });
  });

  describe("isBinOpNode", () => {
    it("should identify binary operation nodes", () => {
      const ast = parseExpression("1 + 2");
      expect(ast).not.toBeNull();
      expect(isBinOpNode(ast!)).toBe(true);
      if (isBinOpNode(ast!)) {
        expect(ast.op).toBe("+");
        expect(isNumNode(ast.left)).toBe(true);
        expect(isNumNode(ast.right)).toBe(true);
      }
    });

    it("should identify multiplication nodes", () => {
      const ast = parseExpression("3 * 4");
      expect(ast).not.toBeNull();
      expect(isBinOpNode(ast!)).toBe(true);
      if (isBinOpNode(ast!)) {
        expect(ast.op).toBe("*");
      }
    });

    it("should return false for non-binary-op nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isBinOpNode(ast!)).toBe(false);
    });
  });

  describe("isUnaryOpNode", () => {
    it("should identify unary minus nodes", () => {
      const ast = parseExpression("-5");
      expect(ast).not.toBeNull();
      expect(isUnaryOpNode(ast!)).toBe(true);
      if (isUnaryOpNode(ast!)) {
        expect(ast.op).toBe("-");
        expect(isNumNode(ast.expr)).toBe(true);
      }
    });

    it("should identify logical not nodes", () => {
      const ast = parseExpression("!true");
      expect(ast).not.toBeNull();
      expect(isUnaryOpNode(ast!)).toBe(true);
      if (isUnaryOpNode(ast!)) {
        expect(ast.op).toBe("!");
        expect(isBooleanNode(ast.expr)).toBe(true);
      }
    });

    it("should return false for non-unary-op nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isUnaryOpNode(ast!)).toBe(false);
    });
  });

  describe("isListNode", () => {
    it("should identify list nodes", () => {
      const ast = parseExpression("1, 2, 3");
      expect(ast).not.toBeNull();
      expect(isListNode(ast!)).toBe(true);
      if (isListNode(ast!)) {
        expect(ast.elements).toHaveLength(3);
      }
    });

    it("should return false for non-list nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isListNode(ast!)).toBe(false);
    });
  });

  describe("isImplicitListNode", () => {
    it("should identify implicit list nodes", () => {
      const ast = parseExpression("1 2 3px");
      expect(ast).not.toBeNull();
      expect(isImplicitListNode(ast!)).toBe(true);
      if (isImplicitListNode(ast!)) {
        expect(ast.elements.length).toBeGreaterThan(0);
        expect(ast.isImplicit).toBe(true);
      }
    });

    it("should return false for explicit lists", () => {
      const ast = parseExpression("1, 2, 3");
      expect(ast).not.toBeNull();
      // This is a ListNode, not ImplicitListNode
      expect(isImplicitListNode(ast!)).toBe(false);
    });
  });

  describe("isFunctionCallNode", () => {
    it("should identify function call nodes", () => {
      const ast = parseExpression("SUM(1, 2, 3)");
      expect(ast).not.toBeNull();
      expect(isFunctionCallNode(ast!)).toBe(true);
      if (isFunctionCallNode(ast!)) {
        expect(ast.name).toBe("SUM");
        expect(ast.args).toHaveLength(3);
      }
    });

    it("should identify function calls with no arguments", () => {
      const ast = parseExpression("pi()");
      expect(ast).not.toBeNull();
      expect(isFunctionCallNode(ast!)).toBe(true);
      if (isFunctionCallNode(ast!)) {
        expect(ast.name).toBe("pi");
        expect(ast.args).toHaveLength(0);
      }
    });

    it("should return false for non-function-call nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isFunctionCallNode(ast!)).toBe(false);
    });
  });

  describe("isReferenceNode", () => {
    it("should identify reference nodes", () => {
      const ast = parseExpression("{myRef}");
      expect(ast).not.toBeNull();
      expect(isReferenceNode(ast!)).toBe(true);
      if (isReferenceNode(ast!)) {
        expect(ast.value).toBe("myRef");
      }
    });

    it("should return false for non-reference nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isReferenceNode(ast!)).toBe(false);
    });
  });

  describe("isIdentifierNode", () => {
    it("should identify identifier nodes", () => {
      const ast = parseExpression("myVariable");
      expect(ast).not.toBeNull();
      expect(isIdentifierNode(ast!)).toBe(true);
      if (isIdentifierNode(ast!)) {
        expect(ast.name).toBe("myVariable");
      }
    });

    it("should return false for non-identifier nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isIdentifierNode(ast!)).toBe(false);
    });
  });

  describe("isHexColorNode", () => {
    it("should identify hex color nodes", () => {
      const ast = parseExpression("#ff6b35");
      expect(ast).not.toBeNull();
      expect(isHexColorNode(ast!)).toBe(true);
      if (isHexColorNode(ast!)) {
        expect(ast.value).toBe("#ff6b35");
      }
    });

    it("should identify short hex color nodes", () => {
      const ast = parseExpression("#f00");
      expect(ast).not.toBeNull();
      expect(isHexColorNode(ast!)).toBe(true);
      if (isHexColorNode(ast!)) {
        expect(ast.value).toBe("#f00");
      }
    });

    it("should return false for non-hex-color nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isHexColorNode(ast!)).toBe(false);
    });
  });

  describe("isBooleanNode", () => {
    it("should identify true boolean nodes", () => {
      const ast = parseExpression("true");
      expect(ast).not.toBeNull();
      expect(isBooleanNode(ast!)).toBe(true);
      if (isBooleanNode(ast!)) {
        expect(ast.value).toBe(true);
      }
    });

    it("should identify false boolean nodes", () => {
      const ast = parseExpression("false");
      expect(ast).not.toBeNull();
      expect(isBooleanNode(ast!)).toBe(true);
      if (isBooleanNode(ast!)) {
        expect(ast.value).toBe(false);
      }
    });

    it("should return false for non-boolean nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isBooleanNode(ast!)).toBe(false);
    });
  });

  describe("isNullNode", () => {
    it("should identify null nodes", () => {
      const ast = parseExpression("null");
      expect(ast).not.toBeNull();
      expect(isNullNode(ast!)).toBe(true);
    });

    it("should return false for non-null nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isNullNode(ast!)).toBe(false);
    });
  });

  describe("isNoOpNode", () => {
    it("should identify no-op nodes", () => {
      // NoOpNode is typically used internally, create one manually
      const node = new NoOpNode();
      expect(isNoOpNode(node)).toBe(true);
    });

    it("should return false for non-no-op nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isNoOpNode(ast!)).toBe(false);
    });
  });

  describe("isElementWithUnitNode", () => {
    it("should identify element with unit nodes", () => {
      const ast = parseExpression("42px");
      expect(ast).not.toBeNull();
      expect(isElementWithUnitNode(ast!)).toBe(true);
      if (isElementWithUnitNode(ast!)) {
        expect(ast.unit).toBe("px");
        expect(isNumNode(ast.astNode)).toBe(true);
      }
    });

    it("should identify rem units", () => {
      const ast = parseExpression("1.5rem");
      expect(ast).not.toBeNull();
      expect(isElementWithUnitNode(ast!)).toBe(true);
      if (isElementWithUnitNode(ast!)) {
        expect(ast.unit).toBe("rem");
      }
    });

    it("should return false for non-unit nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isElementWithUnitNode(ast!)).toBe(false);
    });
  });

  describe("isAssignNode", () => {
    it("should identify variable assignment nodes", () => {
      const ast = parseStatement("variable myVar: Number = 42");
      expect(ast).not.toBeNull();
      expect(isAssignNode(ast!)).toBe(true);
      if (isAssignNode(ast!)) {
        expect(ast.varName.name).toBe("myVar");
        expect(ast.assignmentExpr).not.toBeNull();
      }
    });

    it("should identify assignment without value", () => {
      const ast = parseStatement("variable myVar: String");
      expect(ast).not.toBeNull();
      expect(isAssignNode(ast!)).toBe(true);
      if (isAssignNode(ast!)) {
        expect(ast.varName.name).toBe("myVar");
        expect(ast.assignmentExpr).toBeNull();
      }
    });

    it("should return false for non-assignment nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isAssignNode(ast!)).toBe(false);
    });
  });

  describe("isTypeDeclNode", () => {
    it("should work with assignment nodes containing type declarations", () => {
      const ast = parseStatement("variable myVar: Color.RGB = #ff6b35");
      expect(ast).not.toBeNull();
      expect(isAssignNode(ast!)).toBe(true);
      if (isAssignNode(ast!)) {
        const typeDecl = ast.typeDecl;
        expect(isTypeDeclNode(typeDecl)).toBe(true);
        if (isTypeDeclNode(typeDecl)) {
          expect(typeDecl.baseType.name).toBe("Color");
          expect(typeDecl.subTypes).toHaveLength(1);
          expect(typeDecl.subTypes[0].name).toBe("RGB");
        }
      }
    });
  });

  describe("isReassignNode", () => {
    it("should identify variable reassignment nodes", () => {
      const ast = parseStatement("myVar = 42");
      expect(ast).not.toBeNull();
      expect(isReassignNode(ast!)).toBe(true);
      if (isReassignNode(ast!)) {
        expect(ast.baseIdentifier().name).toBe("myVar");
      }
    });

    it("should return false for non-reassignment nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isReassignNode(ast!)).toBe(false);
    });
  });

  describe("isReturnNode", () => {
    it("should identify return statement nodes", () => {
      const ast = parseStatement("return 42");
      expect(ast).not.toBeNull();
      expect(isReturnNode(ast!)).toBe(true);
      if (isReturnNode(ast!)) {
        expect(isNumNode(ast.expr)).toBe(true);
      }
    });

    it("should return false for non-return nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isReturnNode(ast!)).toBe(false);
    });
  });

  describe("isWhileNode", () => {
    it("should identify while loop nodes", () => {
      const ast = parseStatement("while (true) [ return 1; return 2; ]");
      expect(ast).not.toBeNull();
      expect(isWhileNode(ast!)).toBe(true);
      if (isWhileNode(ast!)) {
        expect(isBooleanNode(ast.condition)).toBe(true);
        expect(isStatementListNode(ast.body)).toBe(true);
      }
    });

    it("should return false for non-while nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isWhileNode(ast!)).toBe(false);
    });
  });

  describe("isIfNode", () => {
    it("should identify if statement nodes", () => {
      const ast = parseStatement("if (true) [ return 1; ]");
      expect(ast).not.toBeNull();
      expect(isIfNode(ast!)).toBe(true);
      if (isIfNode(ast!)) {
        expect(ast.conditions.length).toBeGreaterThan(0);
        expect(isIfConditionNode(ast.conditions[0])).toBe(true);
      }
    });

    it("should identify if-else statements", () => {
      const ast = parseStatement("if (true) [ return 1; return 2; ] else [ return 3; return 4; ]");
      expect(ast).not.toBeNull();
      expect(isIfNode(ast!)).toBe(true);
      if (isIfNode(ast!)) {
        expect(ast.elseBody).not.toBeNull();
        expect(isStatementListNode(ast.elseBody!)).toBe(true);
      }
    });

    it("should return false for non-if nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isIfNode(ast!)).toBe(false);
    });
  });

  describe("isIfConditionNode", () => {
    it("should identify if condition nodes", () => {
      const ast = parseStatement("if (true) [ return 1; return 2; ]");
      expect(ast).not.toBeNull();
      expect(isIfNode(ast!)).toBe(true);
      if (isIfNode(ast!)) {
        const condition = ast.conditions[0];
        expect(isIfConditionNode(condition)).toBe(true);
        if (isIfConditionNode(condition)) {
          expect(isBooleanNode(condition.condition)).toBe(true);
          expect(isStatementListNode(condition.body)).toBe(true);
        }
      }
    });
  });

  describe("isBlockNode", () => {
    it("should identify block nodes in control structures", () => {
      // Blocks are parsed as part of control structures, 
      // but internally they wrap statements
      const ast = parseStatement("if (true) [ return 1; return 2; ]");
      expect(ast).not.toBeNull();
      expect(isIfNode(ast!)).toBe(true);
      if (isIfNode(ast!)) {
        // The body is a StatementListNode when there are multiple statements
        expect(isStatementListNode(ast.conditions[0].body)).toBe(true);
      }
    });
  });

  describe("isStatementListNode", () => {
    it("should identify statement list nodes", () => {
      const ast = parseStatement("return 1; return 2");
      expect(ast).not.toBeNull();
      expect(isStatementListNode(ast!)).toBe(true);
      if (isStatementListNode(ast!)) {
        expect(ast.statements).toHaveLength(2);
        expect(isReturnNode(ast.statements[0])).toBe(true);
        expect(isReturnNode(ast.statements[1])).toBe(true);
      }
    });

    it("should return false for single statements", () => {
      const ast = parseStatement("return 1");
      expect(ast).not.toBeNull();
      // Single statement is not wrapped in StatementListNode
      expect(isStatementListNode(ast!)).toBe(false);
    });
  });

  describe("isAttributeAccessNode", () => {
    it("should identify attribute access nodes", () => {
      const ast = parseExpression("{myRef}.property");
      expect(ast).not.toBeNull();
      expect(isAttributeAccessNode(ast!)).toBe(true);
      if (isAttributeAccessNode(ast!)) {
        expect(isReferenceNode(ast.left)).toBe(true);
        expect(isIdentifierNode(ast.right)).toBe(true);
      }
    });

    it("should identify method calls as attribute access", () => {
      const ast = parseExpression("{myRef}.method()");
      expect(ast).not.toBeNull();
      expect(isAttributeAccessNode(ast!)).toBe(true);
      if (isAttributeAccessNode(ast!)) {
        expect(isReferenceNode(ast.left)).toBe(true);
        expect(isFunctionCallNode(ast.right)).toBe(true);
      }
    });

    it("should return false for non-attribute-access nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      expect(isAttributeAccessNode(ast!)).toBe(false);
    });
  });

  describe("matchASTNode", () => {
    it("should match number nodes", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      const result = matchASTNode(ast!, {
        NumNode: (n) => `Number: ${n.value}`,
        default: () => "Unknown",
      });
      expect(result).toBe("Number: 42");
    });

    it("should match string nodes", () => {
      const ast = parseExpression('"hello"');
      expect(ast).not.toBeNull();
      const result = matchASTNode(ast!, {
        StringNode: (s) => `String: ${s.value}`,
        default: () => "Unknown",
      });
      expect(result).toBe("String: hello");
    });

    it("should match binary operation nodes", () => {
      const ast = parseExpression("1 + 2");
      expect(ast).not.toBeNull();
      const result = matchASTNode(ast!, {
        BinOpNode: (b) => `BinOp: ${b.op}`,
        default: () => "Unknown",
      });
      expect(result).toBe("BinOp: +");
    });

    it("should use default case when no match", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      const result = matchASTNode(ast!, {
        StringNode: (s) => `String: ${s.value}`,
        default: (n) => `Default: ${n.nodeType}`,
      });
      expect(result).toBe("Default: NumNode");
    });

    it("should return undefined when no match and no default", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();
      const result = matchASTNode(ast!, {
        StringNode: (s) => `String: ${s.value}`,
      });
      expect(result).toBeUndefined();
    });

    it("should handle complex expressions with nested matching", () => {
      const ast = parseExpression("1 + 2");
      expect(ast).not.toBeNull();
      
      const describe = (node: any): string => {
        return matchASTNode(node, {
          BinOpNode: (b) => `(${describe(b.left)} ${b.op} ${describe(b.right)})`,
          NumNode: (n) => String(n.value),
          default: (n) => n.nodeType,
        }) || "unknown";
      };
      
      expect(describe(ast!)).toBe("(1 + 2)");
    });
  });

  describe("Type Guards - Advanced Use Cases", () => {
    it("should enable exhaustive type checking in custom visitor pattern", () => {
      const ast = parseExpression("1 + 2 * 3");
      expect(ast).not.toBeNull();

      const evaluate = (node: any): number => {
        if (isNumNode(node)) {
          return node.value;
        }
        if (isBinOpNode(node)) {
          const left = evaluate(node.left);
          const right = evaluate(node.right);
          switch (node.op) {
            case "+":
              return left + right;
            case "*":
              return left * right;
            case "-":
              return left - right;
            case "/":
              return left / right;
            default:
              return 0;
          }
        }
        return 0;
      };

      expect(evaluate(ast!)).toBe(7); // 1 + (2 * 3)
    });

    it("should enable type-safe AST transformation", () => {
      const ast = parseExpression("42");
      expect(ast).not.toBeNull();

      // Transform all numbers to their doubled value
      const transform = (node: any): any => {
        if (isNumNode(node)) {
          return { ...node, value: node.value * 2 };
        }
        if (isBinOpNode(node)) {
          return {
            ...node,
            left: transform(node.left),
            right: transform(node.right),
          };
        }
        return node;
      };

      const transformed = transform(ast!);
      expect(isNumNode(transformed)).toBe(true);
      if (isNumNode(transformed)) {
        expect(transformed.value).toBe(84);
      }
    });

    it("should enable type-safe AST traversal", () => {
      const ast = parseExpression("1 + 2 + 3");
      expect(ast).not.toBeNull();

      const numbers: number[] = [];
      const collectNumbers = (node: any): void => {
        if (isNumNode(node)) {
          numbers.push(node.value);
        }
        if (isBinOpNode(node)) {
          collectNumbers(node.left);
          collectNumbers(node.right);
        }
      };

      collectNumbers(ast!);
      expect(numbers).toEqual([1, 2, 3]);
    });
  });
});
