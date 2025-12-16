import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import { DictionarySymbol } from "@interpreter/symbols";
import { TokenResolver } from "@src/processor";
import { describe, expect, it } from "vitest";
import { hasIssueWithCode, toTokenData } from "./test-helpers";

describe("TokenResolver", () => {
  describe("processTokens", () => {
    it("should resolve tokens with no dependencies", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["colors.primary", "#FF0000"],
          ["colors.secondary", "#00FF00"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.resolved.get("colors.secondary")?.value).toBe("#00FF00");
    });

    it("should resolve tokens with simple references", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["colors.primary", "#FF0000"],
          ["colors.secondary", "{colors.primary}"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.resolved.get("colors.secondary")?.value).toBe("#FF0000");
    });

    it("should resolve tokens with multiple dependencies", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["spacing.base", "8"],
          ["spacing.small", "{spacing.base} / 2"],
          ["spacing.large", "{spacing.base} * 2"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("spacing.base")?.value).toBe(8);
      expect(result.resolved.get("spacing.small")?.value).toBe(4);
      expect(result.resolved.get("spacing.large")?.value).toBe(16);
    });

    it("should resolve tokens with chained dependencies", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "10"],
          ["b", "{a} + 5"],
          ["c", "{b} * 2"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")?.value).toBe(15);
      expect(result.resolved.get("c")?.value).toBe(30);
    });

    it("should add circular dependencies to issues instead of throwing", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "{b}"],
          ["b", "{a}"],
        ]),
      );

      const result = processor.processTokens(tokens);

      // Should have circular dependency issues
      expect(hasIssueWithCode(result.issues, ProcessorErrorCode.CIRCULAR_DEPENDENCY)).toBe(true);
      expect(result.issues?.has("a")).toBe(true);
      expect(result.issues?.has("b")).toBe(true);
    });

    it("should handle mix of simple values and expressions", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["colors.primary", "#FF0000"],
          ["colors.secondary", "{colors.primary}"],
          ["spacing.base", "8"],
          ["spacing.double", "{spacing.base} * 2"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.primary")?.value).toBe("#FF0000");
      expect(result.resolved.get("colors.secondary")?.value).toBe("#FF0000");
      expect(result.resolved.get("spacing.base")?.value).toBe(8);
      expect(result.resolved.get("spacing.double")?.value).toBe(16);
    });

    it("should handle tokens with multiple references in one expression", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "10"],
          ["b", "20"],
          ["c", "{a} + {b}"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")?.value).toBe(20);
      expect(result.resolved.get("c")?.value).toBe(30);
    });

    it("should handle parsing errors", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "10"],
          ["b", "{a} + invalid syntax !@#"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")).toBeInstanceOf(Error);
    });

    it("should handle runtime errors", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "10"],
          ["b", "{undefinedVar}"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")).toBeInstanceOf(Error);
    });

    it("should not include missing dependencies in resolved output", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(new Map([["bar", "{foo}"]]));

      const result = processor.processTokens(tokens);

      // "foo" should NOT be in the resolved map since it was never an input token
      expect(result.resolved.has("foo")).toBe(false);
      // "foo" should NOT be in the graph
      expect(result.graph.getNodes().has("foo")).toBe(false);
      // "foo" should NOT be in the issues map
      expect(result.issues?.has("foo") ?? false).toBe(false);

      // Only "bar" should be in the output
      expect(result.resolved.has("bar")).toBe(true);
      expect(result.resolved.get("bar")).toBeInstanceOf(Error);
    });

    it("should create DependencyError for tokens depending on failed tokens", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "{nonexistent}"],
          ["b", "{a} + 10"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")).toBeInstanceOf(Error);
      expect(result.resolved.get("b")).toBeInstanceOf(ProcessorError);

      const bError = result.resolved.get("b") as ProcessorError;
      expect(bError.code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
      expect(bError.data.chain).toContain("b");
      expect(bError.data.chain).toContain("a");
    });

    it("should track dependency error chains", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "{nonexistent}"],
          ["b", "{a} + 10"],
          ["c", "{b} * 2"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")).toBeInstanceOf(Error);
      expect(result.resolved.get("b")).toBeInstanceOf(ProcessorError);
      expect(result.resolved.get("c")).toBeInstanceOf(ProcessorError);

      const cError = result.resolved.get("c") as ProcessorError;
      expect(cError.code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
      expect(cError.data.chain).toContain("c");
      expect(cError.data.chain).toContain("b");
    });

    it("should continue processing other tokens when some fail", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "10"],
          ["b", "{nonexistent}"],
          ["c", "{a} * 2"],
          ["d", "{b} + 5"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(10);
      expect(result.resolved.get("b")).toBeInstanceOf(Error);
      expect(result.resolved.get("c")?.value).toBe(20);
      expect(result.resolved.get("d")).toBeInstanceOf(ProcessorError);
      const dError = result.resolved.get("d") as ProcessorError;
      expect(dError.code).toBe(ProcessorErrorCode.DEPENDENCY_ERROR);
    });

    it("should resolve tokens depending on prefix subtrees", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["colors.brand.primary", "#FF0000"],
          ["colors.brand.secondary", "#00FF00"],
          ["theme.palette", "{colors.brand}"],
          ["theme.primary", "{theme.palette.primary}"],
        ]),
      );

      const result = processor.processTokens(tokens);

      const palette = result.resolved.get("theme.palette");
      expect(palette).toBeInstanceOf(DictionarySymbol);
      const themePrimary = result.resolved.get("theme.primary");
      expect(themePrimary).not.toBeInstanceOf(Error);
      expect(themePrimary?.value).toBe("#FF0000");
    });

    it("should not share variables between token interpretations", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "variable b: Number = 1; b"],
          ["c", "b"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("a")?.value).toBe(1);
      // Token "c" contains bare identifier "b" which should be a string literal
      // The variable "b" declared in token "a" should not leak into token "c"
      expect(result.resolved.get("c")?.value).toBe("b");
    });

    it("should detect circular dependencies involving prefix references to virtual children", () => {
      const processor = new TokenResolver();
      // Edge case: circular through prefix reference
      // a depends on b.x (virtual child of b)
      // b's dictionary contains reference to a
      // Creates circular: a → b.x → b → a
      const tokens = toTokenData(
        new Map([
          ["a", "{b.x}"],
          ["b", "{ x: {a} }"],
        ]),
      );

      const result = processor.processTokens(tokens);

      // Should have issues for tokens in the cycle
      expect(result.issues).toBeDefined();
      const hasCircularError = Array.from(result.issues!.entries()).some(([_tokenName, issues]) =>
        issues.some((issue) => "code" in issue && issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY),
      );
      expect(hasCircularError).toBe(true);
    });

    it("should detect circular dependencies through prefix references", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["a", "{b.x}"],
          ["b", "{ x: {a} }"],
        ]),
      );

      const result = processor.processTokens(tokens);

      // Should have issues for tokens in the cycle
      expect(result.issues).toBeDefined();
      const hasCircularError = Array.from(result.issues!.entries()).some(([_tokenName, issues]) =>
        issues.some((issue) => "code" in issue && issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY),
      );
      expect(hasCircularError).toBe(true);
    });

    it("should handle prefix with only failed token children", () => {
      const processor = new TokenResolver();
      const tokens = toTokenData(
        new Map([
          ["colors.red", "{missing}"],
          ["theme", "{colors}"],
        ]),
      );

      const result = processor.processTokens(tokens);

      expect(result.resolved.get("colors.red")).toBeInstanceOf(Error);

      const theme = result.resolved.get("theme");
      expect(theme).toBeInstanceOf(Error);

      // All tokens should be resolved (not hanging)
      expect(result.resolved.has("colors.red")).toBe(true);
      expect(result.resolved.has("theme")).toBe(true);
    });
  });
});
