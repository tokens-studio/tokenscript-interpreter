import { getAssignmentInfo, getLastStatement } from "@interpreter/ast";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { describe, expect, it } from "vitest";

describe("AST Helpers", () => {
  describe("getLastStatement", () => {
    it("should return the node itself for non-StatementListNode", () => {
      const code = "5 + 5";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).not.toBeNull();
      const lastStatement = getLastStatement(ast!);
      expect(lastStatement).toBe(ast);
      expect(lastStatement.nodeType).toBe("BinOpNode");
    });

    it("should return the last statement from a StatementListNode", () => {
      const code = "variable a: Number = 1; variable b: Number = 2;";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      expect(ast!.nodeType).toBe("StatementListNode");

      const lastStatement = getLastStatement(ast!);
      expect(lastStatement.nodeType).toBe("AssignNode");
      expect((lastStatement as any).varName.name).toBe("b");
    });

    it("should handle single statement as StatementListNode", () => {
      const code = "variable a: Number = 1";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const lastStatement = getLastStatement(ast!);
      expect(lastStatement.nodeType).toBe("AssignNode");
      expect((lastStatement as any).varName.name).toBe("a");
    });
  });

  describe("getAssignmentInfo", () => {
    it("should return null for non-assignment nodes", () => {
      const code = "5 + 5";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).toBeNull();
    });

    it("should detect assignment without value (nullable)", () => {
      const code = "variable foo: String;";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("foo");
      expect(info!.hasAssignment).toBe(false);
    });

    it("should detect assignment with empty string value", () => {
      const code = 'variable foo: String = "";';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("foo");
      expect(info!.hasAssignment).toBe(true);
    });

    it("should detect assignment with string value", () => {
      const code = 'variable foo: String = "bar";';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("foo");
      expect(info!.hasAssignment).toBe(true);
    });

    it("should detect assignment with number value", () => {
      const code = "variable count: Number = 42;";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("count");
      expect(info!.hasAssignment).toBe(true);
    });

    it("should handle multiple statements and check last one", () => {
      const code = 'variable foo: String = "foo"; variable bar: Number;';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("bar");
      expect(info!.hasAssignment).toBe(false);
    });

    it("should return null when last statement is not an assignment", () => {
      const code = 'variable foo: String = "foo"; foo';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).toBeNull();
    });

    it("should handle assignment with color value", () => {
      const code = "variable myColor: Color = srgb(255, 0, 0);";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("myColor");
      expect(info!.hasAssignment).toBe(true);
    });

    it("should handle assignment with expression value", () => {
      const code = "variable result: Number = 5 + 10;";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(false);

      expect(ast).not.toBeNull();
      const info = getAssignmentInfo(ast!);
      expect(info).not.toBeNull();
      expect(info!.varName).toBe("result");
      expect(info!.hasAssignment).toBe(true);
    });
  });
});
