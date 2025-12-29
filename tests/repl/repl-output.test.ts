import { interpretExpression } from "@src/repl";
import { describe, expect, it } from "vitest";

function replExecute(code: string, isInline = false): string | undefined {
  return interpretExpression(code, {}, undefined, isInline);
}

describe("REPL Output Behavior", () => {
  describe("Variable assignments", () => {
    it("should return undefined for nullable assignments without value", () => {
      expect(replExecute("variable foo: String;", false)).toBe(undefined);
      expect(replExecute("variable count: Number;", false)).toBe(undefined);
    });

    it("should print assigned values", () => {
      expect(replExecute('variable foo: String = "";', false)).toBe("");
      expect(replExecute('variable foo: String = "foo";', false)).toBe("foo");
      expect(replExecute("variable count: Number = 42;", false)).toBe("42");
      expect(replExecute("variable count: Number = 0;", false)).toBe("0");
      expect(replExecute("variable flag: Boolean = true;", false)).toBe("true");
    });

    it("should print result of expression assignments", () => {
      expect(replExecute("variable result: Number = 5 * 10;", false)).toBe("50");
      expect(replExecute("variable nested: Number = (5 + 3) * 2;", false)).toBe("16");
    });
  });

  describe("Variable reassignments", () => {
    it("should print reassigned values", () => {
      expect(replExecute("variable a: Number; a = 1 + 1", false)).toBe("2");
      expect(replExecute('variable a: String; a = "hello"', false)).toBe("hello");
      expect(replExecute("variable a: Number = 5; a = a * 2", false)).toBe("10");
    });

    it("should print last reassignment in multiple statements", () => {
      expect(replExecute("variable a: Number = 1; a = 2; a = 3", false)).toBe("3");
    });
  });

  describe("Multiple statements", () => {
    it("should print last assigned variable value", () => {
      expect(replExecute('variable foo: String = "foo"; variable bar: String = "bar";', false)).toBe("bar");
    });

    it("should return undefined when last statement is nullable assignment", () => {
      expect(replExecute('variable foo: String = "foo"; variable bar: String;', false)).toBe(undefined);
    });

    it("should print variable reference value", () => {
      expect(replExecute('variable foo: String = "foo"; foo', false)).toBe("foo");
    });

    it("should print expression result as last statement", () => {
      expect(replExecute("variable a: Number = 5; variable b: Number = 10; a + b", false)).toBe("15");
    });
  });

  describe("Expressions", () => {
    it("should print expression results in inline mode", () => {
      expect(replExecute("5 + 10", true)).toBe("15");
      expect(replExecute('"hello"', true)).toBe("hello");
      expect(replExecute("true", true)).toBe("true");
      expect(replExecute("null", true)).toBe("null");
    });

    it("should handle multi-line script mode", () => {
      expect(replExecute("variable a: Number = 10;\nvariable b: Number = 20;\na + b", false)).toBe("30");
      expect(replExecute("variable a: Number = 10;\nvariable b: Number = 20;", false)).toBe("20");
    });
  });
});
