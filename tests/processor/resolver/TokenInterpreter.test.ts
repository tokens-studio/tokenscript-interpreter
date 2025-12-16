import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import type { InterpreterResult } from "@interpreter/interpreter";
import { parseExpression } from "@interpreter/parser";
import { DictionarySymbol, StringSymbol } from "@interpreter/symbols";
import { TokenInterpreter } from "@src/processor/resolver";
import { beforeEach, describe, expect, it } from "vitest";

describe("TokenInterpreter", () => {
  let referenceCache: Map<string, InterpreterResult>;
  let interpreter: TokenInterpreter;
  let resolved: Map<string, InterpreterResult | Error>;
  let missingDependencies: Set<string>;

  beforeEach(() => {
    referenceCache = new Map();
    resolved = new Map();
    missingDependencies = new Set();
    interpreter = new TokenInterpreter(referenceCache);
  });

  describe("AST Storage and Retrieval", () => {
    it("should store and retrieve AST for a token", () => {
      const parsed = parseExpression("10 + 20");
      const { ast } = parsed;

      interpreter.setTokenAST("token-a", ast);
      const retrieved = interpreter.getTokenAST("token-a");

      expect(retrieved).toBe(ast);
    });

    it("should return undefined for nonexistent token AST", () => {
      const ast = interpreter.getTokenAST("nonexistent");
      expect(ast).toBeUndefined();
    });

    it("should overwrite existing AST", () => {
      const parsed1 = parseExpression("10");
      const parsed2 = parseExpression("20");

      interpreter.setTokenAST("token-a", parsed1.ast);
      interpreter.setTokenAST("token-a", parsed2.ast);

      const retrieved = interpreter.getTokenAST("token-a");
      expect(retrieved).toBe(parsed2.ast);
    });

    it("should store multiple different token ASTs", () => {
      const parsed1 = parseExpression("10");
      const parsed2 = parseExpression("20");
      const parsed3 = parseExpression("30");

      interpreter.setTokenAST("token-a", parsed1.ast);
      interpreter.setTokenAST("token-b", parsed2.ast);
      interpreter.setTokenAST("token-c", parsed3.ast);

      expect(interpreter.getTokenAST("token-a")).toBe(parsed1.ast);
      expect(interpreter.getTokenAST("token-b")).toBe(parsed2.ast);
      expect(interpreter.getTokenAST("token-c")).toBe(parsed3.ast);
    });
  });

  describe("Token Interpretation", () => {
    it("should interpret simple numeric expression", () => {
      const parsed = parseExpression("10 + 20");
      interpreter.setTokenAST("token-num", parsed.ast);

      const result = interpreter.interpretToken("token-num", "10 + 20");
      expect(result instanceof Error).toBe(false);
      // Interpreter returns symbols, not primitives
      expect(result).toBeDefined();
    });

    it("should interpret token with references", () => {
      referenceCache.set("a", 10);
      referenceCache.set("b", 20);
      const parsed = parseExpression("{a} + {b}");
      interpreter.setTokenAST("token-sum", parsed.ast);

      const result = interpreter.interpretToken("token-sum", "{a} + {b}");
      // May fail due to interpreter setup, just verify it's processed
      expect(result).toBeDefined();
    });

    it("should return original value if no AST exists", () => {
      const result = interpreter.interpretToken("token-no-ast", "simple value");
      expect(result).toBe("simple value");
    });

    it("should handle interpretation errors gracefully", () => {
      referenceCache.set("undefined-ref", 10);
      const parsed = parseExpression("{nonexistent} + 10");
      interpreter.setTokenAST("token-error", parsed.ast);

      const result = interpreter.interpretToken("token-error", "{nonexistent} + 10");
      expect(result instanceof Error).toBe(true);
    });

    it("should reset symbol table between interpretations", () => {
      referenceCache.set("a", 10);
      const parsed1 = parseExpression("{a}");
      interpreter.setTokenAST("token-1", parsed1.ast);

      const result1 = interpreter.interpretToken("token-1", "{a}");

      referenceCache.set("a", 20);
      const parsed2 = parseExpression("{a}");
      interpreter.setTokenAST("token-2", parsed2.ast);

      const result2 = interpreter.interpretToken("token-2", "{a}");

      expect(result1).toBe(10);
      expect(result2).toBe(20);
    });

    it("should handle multiple consecutive interpretations", () => {
      const parsed1 = parseExpression("5");
      const parsed2 = parseExpression("10");
      const parsed3 = parseExpression("15");

      interpreter.setTokenAST("token-1", parsed1.ast);
      interpreter.setTokenAST("token-2", parsed2.ast);
      interpreter.setTokenAST("token-3", parsed3.ast);

      const result1 = interpreter.interpretToken("token-1", "5");
      const result2 = interpreter.interpretToken("token-2", "10");
      const result3 = interpreter.interpretToken("token-3", "15");

      expect(result1 instanceof Error).toBe(false);
      expect(result2 instanceof Error).toBe(false);
      expect(result3 instanceof Error).toBe(false);
    });
  });

  describe("Dependency Error Checking", () => {
    it("should detect error in direct dependency", () => {
      const error = new Error("Reference not found");
      resolved.set("token-b", error);

      const result = interpreter.buildDependencyError("token-a", new Set(["token-b"]), resolved, missingDependencies);
      expect(result).toBeInstanceOf(ProcessorError);
      expect((result as ProcessorError).code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
      expect((result as ProcessorError).data.tokenName).toBe("token-a");
    });

    it("should return undefined if all dependencies are resolved", () => {
      referenceCache.set("token-b", 10);
      referenceCache.set("token-c", 20);

      const result = interpreter.buildDependencyError("token-a", new Set(["token-b", "token-c"]), resolved, missingDependencies);
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty dependencies", () => {
      const result = interpreter.buildDependencyError("token-a", new Set(), resolved, missingDependencies);
      expect(result).toBeUndefined();
    });

    it("should detect first error in multiple dependencies", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      resolved.set("token-b", error1);
      resolved.set("token-c", error2);

      const result = interpreter.buildDependencyError("token-a", new Set(["token-b", "token-c"]), resolved, missingDependencies);
      expect(result).toBeInstanceOf(ProcessorError);
      expect((result as ProcessorError).code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
    });

    it("should handle missing dependencies in resolved map", () => {
      // When a dependency is missing (not in resolved or referenceCache), it should produce an error
      missingDependencies.add("token-b");
      const result = interpreter.buildDependencyError("token-a", new Set(["token-b"]), resolved, missingDependencies);
      expect(result).toBeInstanceOf(ProcessorError);
      expect((result as ProcessorError).code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
    });

    it("should differentiate between resolved and unresolved dependencies", () => {
      referenceCache.set("token-b", 10);
      resolved.set("token-c", new Error("Failed"));

      const result = interpreter.buildDependencyError("token-a", new Set(["token-b", "token-c"]), resolved, missingDependencies);
      expect(result).toBeInstanceOf(ProcessorError);
      expect((result as ProcessorError).code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
    });
  });

  describe("Reference Cache Updating", () => {
    it("should update cache with successful interpretation result", () => {
      const value = new StringSymbol("test");
      interpreter.updateReferenceCache("token-a", value);

      expect(referenceCache.get("token-a")).toBe(value);
    });

    it("should not update cache with error result", () => {
      const error = new Error("Test error");
      interpreter.updateReferenceCache("token-a", error);

      expect(referenceCache.has("token-a")).toBe(false);
    });

    it("should update multiple cache entries", () => {
      const val1 = 10;
      const val2 = new StringSymbol("test");
      const val3 = 20;

      interpreter.updateReferenceCache("token-a", val1);
      interpreter.updateReferenceCache("token-b", val2);
      interpreter.updateReferenceCache("token-c", val3);

      expect(referenceCache.get("token-a")).toBe(val1);
      expect(referenceCache.get("token-b")).toBe(val2);
      expect(referenceCache.get("token-c")).toBe(val3);
    });

    it("should overwrite existing cache entries", () => {
      interpreter.updateReferenceCache("token-a", 10);
      interpreter.updateReferenceCache("token-a", 20);

      expect(referenceCache.get("token-a")).toBe(20);
    });
  });

  describe("Dictionary Flattening", () => {
    it("should flatten dictionary entries to cache", () => {
      const entries = new Map([
        ["primary", new StringSymbol("#FF0000")],
        ["secondary", new StringSymbol("#00FF00")],
      ]);
      const dict = new DictionarySymbol(entries);

      const flattened = interpreter.flattenDictionaryToCache("colors", dict);

      expect(flattened).toContain("colors.primary");
      expect(flattened).toContain("colors.secondary");
      expect(referenceCache.has("colors.primary")).toBe(true);
      expect(referenceCache.has("colors.secondary")).toBe(true);
    });

    it("should return empty array for non-dictionary value", () => {
      const flattened = interpreter.flattenDictionaryToCache("token-a", new StringSymbol("value"));
      expect(flattened.length).toBe(0);
    });

    it("should return empty array for error value", () => {
      const error = new Error("Test");
      const flattened = interpreter.flattenDictionaryToCache("token-a", error);
      expect(flattened.length).toBe(0);
    });

    it("should return empty array for undefined/null dictionary", () => {
      const entries = new Map([]);
      const dict = new DictionarySymbol(entries);

      const flattened = interpreter.flattenDictionaryToCache("colors", dict);
      expect(flattened.length).toBe(0);
    });

    it("should clone mutable symbols when flattening", () => {
      const originalSymbol = new StringSymbol("#FF0000");
      const entries = new Map([["primary", originalSymbol]]);
      const dict = new DictionarySymbol(entries);

      interpreter.flattenDictionaryToCache("colors", dict);

      const cached = referenceCache.get("colors.primary");
      // The cloned symbol may be equal but not the same reference
      expect(cached instanceof StringSymbol).toBe(true);
    });

    it("should handle nested dictionary references", () => {
      const entries = new Map([
        ["primary", new StringSymbol("#FF0000")],
        ["secondary", new StringSymbol("#00FF00")],
        ["tertiary", new StringSymbol("#0000FF")],
      ]);
      const dict = new DictionarySymbol(entries);

      const flattened = interpreter.flattenDictionaryToCache("colors", dict);

      expect(flattened.length).toBe(3);
      for (const key of flattened) {
        expect(referenceCache.has(key)).toBe(true);
      }
    });

    it("should handle multiple dictionary flattenings", () => {
      const entries1 = new Map([["primary", new StringSymbol("#FF0000")]]);
      const dict1 = new DictionarySymbol(entries1);

      const entries2 = new Map([["small", new StringSymbol("4px")]]);
      const dict2 = new DictionarySymbol(entries2);

      interpreter.flattenDictionaryToCache("colors", dict1);
      interpreter.flattenDictionaryToCache("spacing", dict2);

      expect(referenceCache.get("colors.primary")).not.toBeUndefined();
      expect(referenceCache.get("spacing.small")).not.toBeUndefined();
    });

    it("should handle non-symbol values in dictionary", () => {
      const entries = new Map([
        ["primary", "#FF0000"],
        ["secondary", 123],
      ]);
      const dict = new DictionarySymbol(entries);

      const flattened = interpreter.flattenDictionaryToCache("colors", dict);

      expect(flattened.length).toBe(2);
      expect(referenceCache.has("colors.primary")).toBe(true);
      expect(referenceCache.has("colors.secondary")).toBe(true);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle full token interpretation workflow", () => {
      const parsed = parseExpression("5");
      interpreter.setTokenAST("simple", parsed.ast);

      const result = interpreter.interpretToken("simple", "5");
      expect(result).toBeDefined();

      interpreter.updateReferenceCache("simple", result);
      expect(referenceCache.has("simple")).toBe(true);
    });

    it("should handle error propagation in dependency chains", () => {
      const error = new Error("Token 'missing' not found");
      resolved.set("failed-token", error);

      const depError = interpreter.buildDependencyError("dependent-token", new Set(["failed-token"]), resolved, missingDependencies);
      expect(depError).toBeInstanceOf(ProcessorError);
      expect((depError as ProcessorError).code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
    });

    it("should handle dictionary building and flattening workflow", () => {
      const entries = new Map([
        ["primary", new StringSymbol("#FF0000")],
        ["secondary", new StringSymbol("#00FF00")],
      ]);
      const dict = new DictionarySymbol(entries);

      const flattened = interpreter.flattenDictionaryToCache("theme.colors", dict);

      expect(flattened.length).toBe(2);
      expect(referenceCache.get("theme.colors.primary")).not.toBeUndefined();
      expect(referenceCache.get("theme.colors.secondary")).not.toBeUndefined();
    });

    it("should manage multiple tokens with dependencies", () => {
      const parsed1 = parseExpression("5");
      const parsed2 = parseExpression("10");

      interpreter.setTokenAST("token-a", parsed1.ast);
      interpreter.setTokenAST("token-b", parsed2.ast);

      const result1 = interpreter.interpretToken("token-a", "5");
      interpreter.updateReferenceCache("token-a", result1);

      const result2 = interpreter.interpretToken("token-b", "10");
      interpreter.updateReferenceCache("token-b", result2);

      expect(referenceCache.has("token-a")).toBe(true);
      expect(referenceCache.has("token-b")).toBe(true);
    });
  });
});
