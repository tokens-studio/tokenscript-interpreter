import { ReferenceNode, walkAST } from "@interpreter/ast";
import {
  collectAllReferences,
  hasPartialNodes,
  IncompleteType,
  ParseState,
  PartialBinOpNode,
  PartialFunctionCallNode,
  PartialParenNode,
  PartialReferenceNode,
  PartialStringNode,
  PartialUnaryOpNode,
  parseTolerantly,
} from "@interpreter/tolerant";
import { describe, expect, it } from "vitest";

describe("Tolerant Parser", () => {
  describe("parseTolerantly", () => {
    describe("Complete input", () => {
      it("should parse complete expression with COMPLETE state", () => {
        const result = parseTolerantly("1 + 2");

        expect(result.state).toBe(ParseState.COMPLETE);
        expect(result.incomplete).toHaveLength(0);
        expect(result.ast).not.toBeNull();
      });

      it("should parse complete reference", () => {
        const result = parseTolerantly("{color}");

        expect(result.state).toBe(ParseState.COMPLETE);
        expect(result.incomplete).toHaveLength(0);
        expect(result.ast).toBeInstanceOf(ReferenceNode);
      });

      it("should parse complete function call", () => {
        const result = parseTolerantly("rgb(255, 128, 64)");

        expect(result.state).toBe(ParseState.COMPLETE);
        expect(result.incomplete).toHaveLength(0);
      });
    });

    describe("Partial References", () => {
      it("should parse incomplete reference as PartialReferenceNode", () => {
        const result = parseTolerantly("{color");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.UNCLOSED_REFERENCE);
        expect(result.ast).toBeInstanceOf(PartialReferenceNode);

        const partialRef = result.ast as PartialReferenceNode;
        expect(partialRef.partialValue).toBe("color");
      });

      it("should parse incomplete reference with dot path", () => {
        const result = parseTolerantly("{color.primary");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialReferenceNode);

        const partialRef = result.ast as PartialReferenceNode;
        expect(partialRef.partialValue).toBe("color.primary");
      });

      it("should parse empty incomplete reference", () => {
        const result = parseTolerantly("{");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialReferenceNode);

        const partialRef = result.ast as PartialReferenceNode;
        expect(partialRef.partialValue).toBe("");
      });
    });

    describe("Partial Strings", () => {
      it("should parse incomplete string as PartialStringNode", () => {
        const result = parseTolerantly('"hello');

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.UNCLOSED_STRING);
        expect(result.ast).toBeInstanceOf(PartialStringNode);

        const partialStr = result.ast as PartialStringNode;
        expect(partialStr.partialValue).toBe("hello");
      });
    });

    describe("Partial Function Calls", () => {
      it("should parse incomplete function call as PartialFunctionCallNode", () => {
        const result = parseTolerantly("rgb(255, 128");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.UNCLOSED_FUNCTION);
        expect(result.ast).toBeInstanceOf(PartialFunctionCallNode);

        const partialFunc = result.ast as PartialFunctionCallNode;
        expect(partialFunc.name).toBe("rgb");
        expect(partialFunc.args).toHaveLength(2);
      });

      it("should parse function with no args started", () => {
        const result = parseTolerantly("rgb(");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialFunctionCallNode);
      });
    });

    describe("Partial Binary Operations", () => {
      it("should parse incomplete addition as PartialBinOpNode", () => {
        const result = parseTolerantly("1 +");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.MISSING_OPERAND);
        expect(result.ast).toBeInstanceOf(PartialBinOpNode);
      });

      it("should parse incomplete multiplication as PartialBinOpNode", () => {
        const result = parseTolerantly("5 *");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialBinOpNode);
      });

      it("should parse incomplete comparison as PartialBinOpNode", () => {
        const result = parseTolerantly("5 >");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialBinOpNode);
      });

      it("should parse incomplete logical AND as PartialBinOpNode", () => {
        const result = parseTolerantly("1 &&");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.MISSING_OPERAND);
        expect(result.ast).toBeInstanceOf(PartialBinOpNode);
      });

      it("should parse incomplete logical OR as PartialBinOpNode", () => {
        const result = parseTolerantly("true ||");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialBinOpNode);
      });
    });

    describe("Partial Unary Operations", () => {
      it("should parse incomplete unary minus as PartialUnaryOpNode", () => {
        const result = parseTolerantly("-");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.MISSING_OPERAND);
        expect(result.ast).toBeInstanceOf(PartialUnaryOpNode);
      });

      it("should parse incomplete logical not as PartialUnaryOpNode", () => {
        const result = parseTolerantly("!");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialUnaryOpNode);
      });
    });

    describe("Partial Parentheses", () => {
      it("should parse unclosed paren as PartialParenNode", () => {
        const result = parseTolerantly("(1 + 2");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.incomplete).toHaveLength(1);
        expect(result.incomplete[0].type).toBe(IncompleteType.UNCLOSED_PAREN);
        expect(result.ast).toBeInstanceOf(PartialParenNode);
      });

      it("should parse empty unclosed paren", () => {
        const result = parseTolerantly("(");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialParenNode);
      });
    });

    describe("Mixed incomplete input", () => {
      it("should handle complete + incomplete in expression", () => {
        const result = parseTolerantly("{color} + {foo");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        // Should have the partial reference in incomplete list
        expect(result.incomplete.some((i) => i.type === IncompleteType.UNCLOSED_REFERENCE)).toBe(true);
      });
    });

    describe("Token collection", () => {
      it("should include all tokens in result", () => {
        const result = parseTolerantly("{color} + 5");

        expect(result.tokens).toHaveLength(4); // REFERENCE, OPERATION, NUMBER, EOF
      });

      it("should include partial tokens", () => {
        const result = parseTolerantly("{color");

        expect(result.tokens.some((t) => t.type === "PARTIAL_REFERENCE")).toBe(true);
      });
    });
  });

  describe("collectAllReferences", () => {
    it("should collect complete references", () => {
      const result = parseTolerantly("{color} + {size}");
      const refs = collectAllReferences(result.ast);

      expect(refs).toHaveLength(2);
      expect(refs.every((r) => !r.isPartial)).toBe(true);
      expect(refs.map((r) => r.name)).toContain("color");
      expect(refs.map((r) => r.name)).toContain("size");
    });

    it("should collect partial references", () => {
      const result = parseTolerantly("{color} + {foo");
      const refs = collectAllReferences(result.ast);

      expect(refs).toHaveLength(2);
      expect(refs.some((r) => r.isPartial)).toBe(true);

      const partialRef = refs.find((r) => r.isPartial);
      expect(partialRef?.name).toBe("foo");
    });

    it("should return empty array for null ast", () => {
      const refs = collectAllReferences(null);
      expect(refs).toEqual([]);
    });
  });

  describe("hasPartialNodes", () => {
    it("should return false for complete AST", () => {
      const result = parseTolerantly("{color} + 5");
      expect(hasPartialNodes(result.ast)).toBe(false);
    });

    it("should return true for AST with partial reference", () => {
      const result = parseTolerantly("{color");
      expect(hasPartialNodes(result.ast)).toBe(true);
    });

    it("should return true for AST with partial function call", () => {
      const result = parseTolerantly("rgb(255");
      expect(hasPartialNodes(result.ast)).toBe(true);
    });

    it("should return true for nested partial nodes", () => {
      const result = parseTolerantly("1 + {foo");
      expect(hasPartialNodes(result.ast)).toBe(true);
    });

    it("should return false for null AST", () => {
      expect(hasPartialNodes(null)).toBe(false);
    });
  });

  describe("Real-world use cases", () => {
    describe("Autocomplete scenarios", () => {
      it("should parse reference being typed for autocomplete", () => {
        const result = parseTolerantly("{col");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialReferenceNode);

        const partialRef = result.ast as PartialReferenceNode;
        expect(partialRef.partialValue).toBe("col");
        // Can use this to filter: ["color", "column"].filter(r => r.startsWith("col"))
      });

      it("should parse nested reference being typed", () => {
        const result = parseTolerantly("{color.pri");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialReferenceNode);

        const partialRef = result.ast as PartialReferenceNode;
        expect(partialRef.partialValue).toBe("color.pri");
      });
    });

    describe("Live color preview scenarios", () => {
      it("should parse incomplete rgb function for preview", () => {
        const result = parseTolerantly("rgb(255, 128, 64");

        expect(result.state).toBe(ParseState.INCOMPLETE);
        expect(result.ast).toBeInstanceOf(PartialFunctionCallNode);

        const func = result.ast as PartialFunctionCallNode;
        expect(func.name).toBe("rgb");
        expect(func.args).toHaveLength(3);
        // Can extract values for live preview
      });

      it("should parse partial hex color", () => {
        const result = parseTolerantly("#FF");

        // Hex colors with partial length should still parse
        expect(result.state).toBe(ParseState.COMPLETE);
      });
    });

    describe("Syntax highlighting scenarios", () => {
      it("should identify incomplete reference for highlighting", () => {
        const result = parseTolerantly("1 + {foo");

        expect(result.state).toBe(ParseState.INCOMPLETE);

        // Find the incomplete info for the reference
        const incompleteRef = result.incomplete.find((i) => i.type === IncompleteType.UNCLOSED_REFERENCE);
        expect(incompleteRef).toBeDefined();
        expect(incompleteRef?.partialValue).toBe("foo");
      });
    });

    describe("walkAST with partial nodes", () => {
      it("should walk partial function call args inside attribute access", () => {
        const result = parseTolerantly("{ref}.method(1, {col");
        const visited: string[] = [];

        if (result.ast) {
          walkAST(result.ast, (node) => {
            visited.push(node.nodeType);
          });
        }

        expect(visited).toContain("PartialFunctionCallNode");
      });
    });
  });
});
