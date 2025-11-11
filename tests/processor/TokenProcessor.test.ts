import { DictionarySymbol } from "@interpreter/symbols";
import { DependencyError, TokenProcessor } from "@src/processor";
import { describe, expect, it } from "vitest";

describe("TokenProcessor", () => {
  describe("processTokens", () => {
    it("should resolve tokens with no dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.primary", "#FF0000"],
        ["colors.secondary", "#00FF00"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.resolved.get("colors.secondary")?.value).toBe("#00FF00");
    });

    it("should resolve tokens with simple references", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.primary", "#FF0000"],
        ["colors.secondary", "{colors.primary}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.resolved.get("colors.secondary")?.value).toBe("#FF0000");
    });

    it("should resolve tokens with multiple dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["spacing.base", "8"],
        ["spacing.small", "{spacing.base} / 2"],
        ["spacing.large", "{spacing.base} * 2"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("spacing.base")?.value).toBe(8);
      expect(result.resolved.get("spacing.small")?.value).toBe(4);
      expect(result.resolved.get("spacing.large")?.value).toBe(16);
    });

    it("should resolve tokens with chained dependencies", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{a} + 5"],
        ["c", "{b} * 2"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")?.value).toBe(15);
      expect(result.resolved.get("c")?.value).toBe(30);
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

      expect(result.resolved.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.resolved.get("colors.secondary")?.value).toBe("#FF0000");
      expect(result.resolved.get("spacing.base")?.value).toBe(8);
      expect(result.resolved.get("spacing.double")?.value).toBe(16);
    });

    it("should handle tokens with multiple references in one expression", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "20"],
        ["c", "{a} + {b}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")?.value).toBe(20);
      expect(result.resolved.get("c")?.value).toBe(30);
    });

    it("should handle parsing errors", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{a} + invalid syntax !@#"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")).toBeInstanceOf(Error);
    });

    it("should handle runtime errors", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "10"],
        ["b", "{undefinedVar}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")).toBeInstanceOf(Error);
    });

    it("should create DependencyError for tokens depending on failed tokens", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "{nonexistent}"],
        ["b", "{a} + 10"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")).toBeInstanceOf(Error);
      expect(result.resolved.get("b")).toBeInstanceOf(DependencyError);

      const bError = result.resolved.get("b") as DependencyError;
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

      expect(result.resolved.get("a")).toBeInstanceOf(Error);
      expect(result.resolved.get("b")).toBeInstanceOf(DependencyError);
      expect(result.resolved.get("c")).toBeInstanceOf(DependencyError);

      const cError = result.resolved.get("c") as DependencyError;
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

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")).toBeInstanceOf(Error);
      expect(result.resolved.get("c")?.value).toBe(20);
      expect(result.resolved.get("d")).toBeInstanceOf(DependencyError);
    });

    it("should resolve tokens depending on prefix subtrees", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.brand.primary", "#FF0000"],
        ["colors.brand.secondary", "#00FF00"],
        ["theme.palette", "{colors.brand}"],
        ["theme.primary", "{theme.palette.primary}"],
      ]);

      const result = processor.processTokens(tokens);

      const palette = result.resolved.get("theme.palette");
      expect(palette).toBeInstanceOf(DictionarySymbol);
      const themePrimary = result.resolved.get("theme.primary");
      expect(themePrimary).not.toBeInstanceOf(Error);
      expect(themePrimary?.value).toBe("#FF0000");
    });



    it("should not share variables between token interpretations", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "variable b: Number = 1; b"],
        ["c", "b"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(1);
      // Token "c" contains bare identifier "b" which should be a string literal
      // The variable "b" declared in token "a" should not leak into token "c"
      expect(result.resolved.get("c")?.value).toBe("b");
    });

    it("should detect circular dependencies involving prefix references to virtual children", () => {
      const processor = new TokenProcessor();
      // Edge case: circular through prefix reference
      // a depends on b.x (virtual child of b)
      // b's dictionary contains reference to a
      // Creates circular: a → b.x → b → a
      const tokens = new Map([
        ["a", "{b.x}"],
        ["b", "{ x: {a} }"],
      ]);

      // This should detect the circular dependency and throw an error
      expect(() => processor.processTokens(tokens)).toThrow(/circular dependency/i);
    });

    it("should detect circular dependencies through prefix references", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["a", "{b.x}"],
        ["b", "{ x: {a} }"],
      ]);

      expect(() => processor.processTokens(tokens)).toThrow(/circular dependency|unresolved/i);
    });

    it("should handle prefix with only failed token children", () => {
      const processor = new TokenProcessor();
      const tokens = new Map([
        ["colors.red", "{missing}"],
        ["theme", "{colors}"],
      ]);

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.red")).toBeInstanceOf(Error);

      const theme = result.resolved.get("theme");
      expect(theme).toBeInstanceOf(Error);

      // All tokens should be resolved (not hanging)
      expect(result.resolved.has("colors.red")).toBe(true);
      expect(result.resolved.has("theme")).toBe(true);

      // Verify no tokens are left unresolved
      expect(result.unresolved.size).toBe(0);
    });
  });
});
