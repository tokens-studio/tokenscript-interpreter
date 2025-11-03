import { describe, expect, it } from "vitest";
import { DependencyError, TokenProcessor } from "@src/processor";

describe("TokenProcessor", () => {
  describe("processTokens", () => {
    it("should resolve tokens with no dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.primary", "#FF0000"],
        ["colors.secondary", "#00FF00"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.get("colors.secondary")?.value).toBe("#00FF00");
    });

    it("should resolve tokens with simple references", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.primary", "#FF0000"],
        ["colors.secondary", "{colors.primary}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.get("colors.secondary")?.value).toBe("#FF0000");
    });

    it("should resolve tokens with multiple dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["spacing.base", "8"],
        ["spacing.small", "{spacing.base} / 2"],
        ["spacing.large", "{spacing.base} * 2"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("spacing.base")?.value).toBe(8);
      expect(result.get("spacing.small")?.value).toBe(4);
      expect(result.get("spacing.large")?.value).toBe(16);
    });

    it("should resolve tokens with chained dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{a} + 5"],
        ["c", "{b} * 2"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")?.value).toBe(10);
      expect(result.get("b")?.value).toBe(15);
      expect(result.get("c")?.value).toBe(30);
    });

    it("should throw error on circular dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "{b}"],
        ["b", "{a}"],
      ]);

      expect(() => processor.processTokens(tokens)).toThrow(/circular dependency/i);
    });

    it("should handle mix of simple values and expressions", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.primary", "#FF0000"],
        ["colors.secondary", "{colors.primary}"],
        ["spacing.base", "8"],
        ["spacing.double", "{spacing.base} * 2"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.get("colors.secondary")?.value).toBe("#FF0000");
      expect(result.get("spacing.base")?.value).toBe(8);
      expect(result.get("spacing.double")?.value).toBe(16);
    });

    it("should handle tokens with multiple references in one expression", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "20"],
        ["c", "{a} + {b}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")?.value).toBe(10);
      expect(result.get("b")?.value).toBe(20);
      expect(result.get("c")?.value).toBe(30);
    });

    it("should handle parsing errors", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{a} + invalid syntax !@#"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")?.value).toBe(10);
      expect(result.get("b")).toBeInstanceOf(Error);
    });

    it("should handle runtime errors", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{undefinedVar}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")?.value).toBe(10);
      expect(result.get("b")).toBeInstanceOf(Error);
    });

    it("should create DependencyError for tokens depending on failed tokens", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "{nonexistent}"],
        ["b", "{a} + 10"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")).toBeInstanceOf(Error);
      expect(result.get("b")).toBeInstanceOf(DependencyError);

      const bError = result.get("b") as DependencyError;
      expect(bError.dependencyChain).toEqual(["b", "a", "nonexistent"]);
      expect(bError.rootError.message).toContain("nonexistent");
    });

    it("should track dependency error chains", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "{nonexistent}"],
        ["b", "{a} + 10"],
        ["c", "{b} * 2"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")).toBeInstanceOf(Error);
      expect(result.get("b")).toBeInstanceOf(DependencyError);
      expect(result.get("c")).toBeInstanceOf(DependencyError);

      const cError = result.get("c") as DependencyError;
      expect(cError.dependencyChain).toEqual(["c", "b", "a", "nonexistent"]);
      expect(cError.rootError.message).toContain("nonexistent");
    });

    it("should continue processing other tokens when some fail", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{nonexistent}"],
        ["c", "{a} * 2"],
        ["d", "{b} + 5"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.get("a")?.value).toBe(10);
      expect(result.get("b")).toBeInstanceOf(Error);
      expect(result.get("c")?.value).toBe(20);
      expect(result.get("d")).toBeInstanceOf(DependencyError);
    });
  });
});
