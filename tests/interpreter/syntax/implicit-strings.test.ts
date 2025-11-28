/**
 * Tests for implicit string parsing behavior
 *
 * Validates implicit string parsing, including edge cases and gotchas
 * around numbers, units, and arithmetic operations.
 * See: https://docs.tokenscript.dev.gcp.tokens.studio/language/syntax#implicit-strings-and-lists
 */
import { describe, expect, it } from "vitest";
import { interpret, interpretAndGetVariable, interpretAndGetVariables } from "../test-helpers";

describe("Implicit Strings - Documentation Examples", () => {
  describe("Basic Behavior", () => {
    it("simple implicit strings work as expected", () => {
      expect(interpret("hello")).toBe("hello");
      expect(interpret("my-variable")).toBe("my-variable");
    });

    it("numbers followed by non-units add spaces", () => {
      // GOTCHA: Space is automatically added!
      expect(interpret("1unknown")).toBe("1 unknown");
      expect(interpret("5test")).toBe("5 test");
    });

    it("3D becomes '3 D' (number + letter)", () => {
      // The parser sees "3" as number, "D" as string
      expect(interpret("3D Font")).toBe("3 D Font");
    });
  });

  describe("Implicit Lists", () => {
    it("creates list from multiple tokens", () => {
      expect(interpret("Hello World")).toBe("Hello World");
      expect(interpret("1px solid black")).toBe("1px solid black");
    });

    it("numbers with spaces create lists", () => {
      expect(interpret("1 unknown")).toBe("1 unknown");
    });
  });

  describe("The Critical Gotcha", () => {
    it("arithmetic + implicit string = confusing result", () => {
      // This is the problematic behavior discussed in Slack!
      // Evaluates (1 + 1) = 2, then creates list with "unknown"
      const result = interpret("1 + 1unknown");
      expect(result).toBe("2 unknown");

      // Users expect either:
      // - An error (can't add number + string)
      // - Or "1 + 1unknown" as a list
      // But NOT "2 unknown"!
    });

    it("arithmetic with spaces behaves same way", () => {
      const result = interpret("1 + 1 unknown");
      expect(result).toBe("2 unknown");
    });
  });

  describe("Explicit Strings (Recommended)", () => {
    it("preserve content exactly as written", () => {
      expect(interpret('"3D Font"')).toBe("3D Font");
      expect(interpret('"1unknown"')).toBe("1unknown");
    });

    it("make intent clear and avoid gotchas", () => {
      // No space added when explicit
      expect(interpret('"1unknown"')).toBe("1unknown");

      // vs implicit (space added)
      expect(interpret("1unknown")).toBe("1 unknown");
    });
  });
});

describe("Implicit Strings - Compliance Tests", () => {
  describe("Basic Implicit String Parsing", () => {
    it("should parse single word as string", () => {
      expect(interpret("hello")).toBe("hello");
      expect(interpret("world")).toBe("world");
    });

    it("should parse hyphenated words as string", () => {
      expect(interpret("my-variable")).toBe("my-variable");
      expect(interpret("font-weight")).toBe("font-weight");
      expect(interpret("border-top-left")).toBe("border-top-left");
    });

    it("should parse underscore words as string", () => {
      expect(interpret("my_variable")).toBe("my_variable");
      expect(interpret("foo_bar_baz")).toBe("foo_bar_baz");
    });

    it("should parse alphanumeric identifiers", () => {
      expect(interpret("variable1")).toBe("variable1");
      expect(interpret("test123")).toBe("test123");
      expect(interpret("a1b2c3")).toBe("a1b2c3");
    });
  });

  describe("Number and Non-Unit Combinations", () => {
    it("should add space between number and non-unit identifier", () => {
      expect(interpret("1unknown")).toBe("1 unknown");
      expect(interpret("5test")).toBe("5 test");
      expect(interpret("42foo")).toBe("42 foo");
      expect(interpret("0bar")).toBe("0 bar");
    });

    it("should add space between number and letter", () => {
      expect(interpret("3D")).toBe("3 D");
      expect(interpret("2B")).toBe("2 B");
      expect(interpret("1a")).toBe("1 a");
    });

    it("should preserve units (no space added)", () => {
      expect(interpret("1px")).toBe("1px");
      expect(interpret("10rem")).toBe("10rem");
      expect(interpret("50%")).toBe("50%");
      expect(interpret("2.5em")).toBe("2.5em");
      expect(interpret("360deg")).toBe("360deg");
    });

    it("should handle decimal numbers with non-units", () => {
      expect(interpret("1.5unknown")).toBe("1.5 unknown");
      expect(interpret("3.14test")).toBe("3.14 test");
    });

    it("should handle negative numbers with non-units", () => {
      expect(interpret("-1unknown")).toBe("-1 unknown");
      expect(interpret("-5test")).toBe("-5 test");
    });
  });

  describe("Implicit Lists (Space-Separated Values)", () => {
    it("should create list from multiple words", () => {
      expect(interpret("Hello World")).toBe("Hello World");
      expect(interpret("foo bar baz")).toBe("foo bar baz");
    });

    it("should create list with mixed types", () => {
      expect(interpret("1px solid black")).toBe("1px solid black");
      expect(interpret("10 20 30")).toBe("10 20 30");
      expect(interpret("red 1px dashed")).toBe("red 1px dashed");
    });

    it("should create list with numbers and non-units", () => {
      expect(interpret("1 unknown")).toBe("1 unknown");
      expect(interpret("5 test value")).toBe("5 test value");
    });

    it("should handle complex list expressions", () => {
      expect(interpret("1px 2px 3px 4px")).toBe("1px 2px 3px 4px");
      expect(interpret("Arial Helvetica sans-serif")).toBe("Arial Helvetica sans-serif");
    });
  });

  describe("Arithmetic with Implicit Strings", () => {
    it("should evaluate arithmetic first, then create list", () => {
      expect(interpret("1 + 1unknown")).toBe("2 unknown");
      expect(interpret("2 * 3test")).toBe("6 test");
      expect(interpret("10 - 5foo")).toBe("5 foo");
      expect(interpret("8 / 2bar")).toBe("4 bar");
    });

    it("should handle arithmetic with spaces", () => {
      expect(interpret("1 + 1 unknown")).toBe("2 unknown");
      expect(interpret("5 * 2 test")).toBe("10 test");
    });

    it("should handle complex arithmetic expressions", () => {
      expect(interpret("(1 + 2) * 3foo")).toBe("9 foo");
      expect(interpret("10 / (2 + 3)bar")).toBe("2 bar");
    });

    it("should handle arithmetic with multiple non-unit words", () => {
      expect(interpret("1 + 1unknown word")).toBe("2 unknown word");
      expect(interpret("2 * 2test value here")).toBe("4 test value here");
    });
  });

  describe("Explicit vs Implicit String Behavior", () => {
    it("should preserve content in explicit strings", () => {
      expect(interpret('"3D Font"')).toBe("3D Font");
      expect(interpret('"1unknown"')).toBe("1unknown");
      expect(interpret('"Hello World"')).toBe("Hello World");
    });

    it("should not add space in explicit strings", () => {
      expect(interpret('"1unknown"')).toBe("1unknown");
      expect(interpret('"5test"')).toBe("5test");
      expect(interpret('"3D"')).toBe("3D");
    });

    it("should not evaluate arithmetic in explicit strings", () => {
      expect(interpret('"1 + 1"')).toBe("1 + 1");
      expect(interpret('"2 * 3"')).toBe("2 * 3");
    });

    it("should handle single quotes same as double quotes", () => {
      expect(interpret("'1unknown'")).toBe("1unknown");
      expect(interpret("'3D Font'")).toBe("3D Font");
      expect(interpret("'Hello World'")).toBe("Hello World");
    });
  });

  describe("Variable Assignment with Implicit Strings", () => {
    it("should assign implicit strings to String variables", () => {
      const result = interpretAndGetVariable("variable text: String = hello;", "text");
      expect(result?.toString()).toBe("hello");
    });

    it("should assign implicit lists to List variables", () => {
      const result = interpretAndGetVariable("variable items: List = foo bar baz;", "items");
      expect(result?.toString()).toBe("foo bar baz");
    });

    it("should handle number + non-unit in variable assignment", () => {
      const result = interpretAndGetVariable("variable text: List = 1unknown;", "text");
      expect(result?.toString()).toBe("1 unknown");
    });

    it("should handle arithmetic with implicit string in assignment", () => {
      const result = interpretAndGetVariable("variable text: List = 1 + 1unknown;", "text");
      expect(result?.toString()).toBe("2 unknown");
    });

    it("should preserve explicit strings in assignment", () => {
      const vars = interpretAndGetVariables(
        `
        variable text1: String = "1unknown";
        variable text2: String = "3D Font";
        `,
        ["text1", "text2"],
      );
      expect(vars.text1?.toString()).toBe("1unknown");
      expect(vars.text2?.toString()).toBe("3D Font");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty implicit string", () => {
      expect(interpret("")).toBe("");
    });

    it("should handle single character", () => {
      expect(interpret("a")).toBe("a");
      expect(interpret("Z")).toBe("Z");
    });

    it("should handle numbers alone", () => {
      expect(interpret("42")).toBe("42");
      expect(interpret("3.14")).toBe("3.14");
      expect(interpret("-5")).toBe("-5");
    });

    it("should handle multiple spaces between words", () => {
      expect(interpret("hello    world")).toBe("hello world");
      expect(interpret("foo  bar  baz")).toBe("foo bar baz");
    });

    it("should handle special characters in identifiers", () => {
      expect(interpret("hello-world")).toBe("hello-world");
      expect(interpret("foo_bar")).toBe("foo_bar");
    });

    it("should handle number at start of expression", () => {
      expect(interpret("1 2 3")).toBe("1 2 3");
      expect(interpret("0test")).toBe("0 test");
    });

    it("should handle mixed case identifiers", () => {
      expect(interpret("HelloWorld")).toBe("HelloWorld");
      expect(interpret("camelCase")).toBe("camelCase");
      expect(interpret("PascalCase")).toBe("PascalCase");
    });
  });

  describe("Complex Real-World Examples", () => {
    it("should handle CSS-like values", () => {
      expect(interpret("1px solid black")).toBe("1px solid black");
      expect(interpret("2rem dashed red")).toBe("2rem dashed red");
      expect(interpret("0 auto")).toBe("0 auto");
    });

    it("should handle font family lists", () => {
      expect(interpret("Arial Helvetica sans-serif")).toBe("Arial Helvetica sans-serif");
      expect(interpret("Times New Roman serif")).toBe("Times New Roman serif");
    });

    it("should handle multiple unit values", () => {
      expect(interpret("10px 20px 30px 40px")).toBe("10px 20px 30px 40px");
      expect(interpret("1rem 2rem")).toBe("1rem 2rem");
    });

    it("should handle color values with fallbacks", () => {
      expect(interpret("rgba(255, 0, 0, 0.5) red")).toBe("rgba(255, 0, 0, 0.5) red");
    });
  });
});
