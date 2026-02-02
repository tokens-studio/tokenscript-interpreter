/**
 * Tests for seconds (s) and milliseconds (ms) unit parsing.
 *
 * The fix uses a two-phase approach:
 * 1. Parser detects adjacent [expr, identifier] patterns and marks them as `possibleUnitExpression`
 * 2. Interpreter checks if the identifier is a registered unit keyword and converts accordingly
 */
import { UnitManager } from "@interpreter/config/managers/unit/manager";
import { interpret, parse } from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("Time Units Parsing", () => {
  describe("UnitManager has seconds registered", () => {
    it("should have seconds unit registered by default", () => {
      const unitManager = new UnitManager();
      const spec = unitManager.getSpecByKeyword("s");
      expect(spec).toBeDefined();
      expect(spec?.name).toBe("seconds");
      expect(spec?.keyword).toBe("s");
    });
  });

  describe("Parser creates NumberWithPossibleUnitNode for adjacent number-identifier", () => {
    it("should parse '3s' as NumberWithPossibleUnitNode", () => {
      const ast = parse("3s", true);
      expect(ast.nodeType).toBe("NumberWithPossibleUnitNode");
      expect((ast as any).numNode.value).toBe(3);
      expect((ast as any).unitIdentifier).toBe("s");
    });

    it("should parse '3.3s' as NumberWithPossibleUnitNode", () => {
      const ast = parse("3.3s", true);
      expect(ast.nodeType).toBe("NumberWithPossibleUnitNode");
      expect((ast as any).numNode.value).toBe(3.3);
      expect((ast as any).unitIdentifier).toBe("s");
    });

    it("should parse '3.3ms' as NumberWithPossibleUnitNode", () => {
      const ast = parse("3.3ms", true);
      expect(ast.nodeType).toBe("NumberWithPossibleUnitNode");
      expect((ast as any).numNode.value).toBe(3.3);
      expect((ast as any).unitIdentifier).toBe("ms");
    });

    it("should parse '-3s' as UnaryOpNode containing NumberWithPossibleUnitNode", () => {
      const ast = parse("-3s", true);
      expect(ast.nodeType).toBe("UnaryOpNode");
      expect((ast as any).expr.nodeType).toBe("NumberWithPossibleUnitNode");
      expect((ast as any).expr.numNode.value).toBe(3);
      expect((ast as any).expr.unitIdentifier).toBe("s");
    });

    it("should NOT parse '3 s' (with space) as NumberWithPossibleUnitNode", () => {
      const ast = parse("3 s", true);
      expect(ast.nodeType).toBe("ImplicitListNode");
    });

    it("should NOT parse '3, s' as NumberWithPossibleUnitNode (it's a ListNode)", () => {
      const ast = parse("3, s", true);
      expect(ast.nodeType).toBe("ListNode");
    });
  });

  describe("Interpreter converts possibleUnitExpression to NumberWithUnit", () => {
    it("should interpret '3s' as 3 seconds", () => {
      const result = interpret("3s");
      expect(result).toBe("3s");
    });

    it("should interpret '3.3s' as 3.3 seconds", () => {
      const result = interpret("3.3s");
      expect(result).toBe("3.3s");
    });

    it("should interpret '-3s' as -3 seconds", () => {
      const result = interpret("-3s");
      expect(result).toBe("-3s");
    });

    it("should interpret '-3.3s' as -3.3 seconds", () => {
      const result = interpret("-3.3s");
      expect(result).toBe("-3.3s");
    });
  });

  describe("Arithmetic with time units", () => {
    it("should add two seconds values", () => {
      const result = interpret("3s + 2s");
      expect(result).toBe("5s");
    });

    it("should add decimal seconds values", () => {
      const result = interpret("3.3s + 2.2s");
      expect(result).toBe("5.5s");
    });

    it("should subtract seconds values", () => {
      const result = interpret("5s - 2s");
      expect(result).toBe("3s");
    });

    it("should multiply seconds by number", () => {
      const result = interpret("3s * 2");
      expect(result).toBe("6s");
    });

    it("should divide seconds by number", () => {
      const result = interpret("6s / 2");
      expect(result).toBe("3s");
    });
  });

  describe("Non-unit identifiers remain as implicit list", () => {
    it("should keep '3foo' as implicit list (foo is not a registered unit)", () => {
      const result = interpret("3foo");
      expect(result).toBe("3 foo");
    });

    it("should keep '3 s' (with space) as implicit list", () => {
      const result = interpret("3 s");
      expect(result).toBe("3 s");
    });
  });

  describe("Contrast with built-in formats (px)", () => {
    it("should parse '3px' as ElementWithUnitNode (built-in format)", () => {
      const ast = parse("3px", true);
      expect(ast.nodeType).toBe("ElementWithUnitNode");
    });

    it("should interpret '3px + 2px' correctly", () => {
      const result = interpret("3px + 2px");
      expect(result).toBe("5px");
    });
  });
});
