import { NumberSymbol } from "@interpreter/symbols";
import { LintRunner, TypeBasedRule } from "@src/processor/linter";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver - CRUD with Linter", () => {
  const createOpacityValidator = () => {
    return (value: any, context: any, createIssue: any) => {
      if (!(value instanceof NumberSymbol)) {
        return createIssue(context, "INVALID_TYPE", "Expected number");
      }
      if (value.value < 0 || value.value > 1) {
        return createIssue(context, "OUT_OF_RANGE", "Opacity must be between 0 and 1");
      }
      return null;
    };
  };

  describe("createToken", () => {
    it("should return lintIssues when creating a token with validation errors", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.createToken({
        tokenPath: "opacity.invalid",
        tokenData: { $type: "opacity", $value: "2.5" },
      });

      expect(result.created).toBe(true);
      expect(result.lintIssues).toBeDefined();
      expect(result.lintIssues?.length).toBeGreaterThan(0);
      expect(result.lintIssues?.[0]?.code).toBe("OUT_OF_RANGE");
    });

    it("should return empty lintIssues when creating a valid token", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.createToken({
        tokenPath: "opacity.valid",
        tokenData: { $type: "opacity", $value: "0.5" },
      });

      expect(result.created).toBe(true);
      expect(result.lintIssues).toEqual([]);
    });
  });

  describe("updateToken", () => {
    it("should return lintIssues when updating a token with validation errors", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>([["opacity.value", { $type: "opacity", $value: "0.5" }]]);
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.updateToken({
        tokenPath: "opacity.value",
        tokenData: { $type: "opacity", $value: "1.5" },
      });

      expect(result.updated).toBe(true);
      expect(result.lintIssues).toBeDefined();
      expect(result.lintIssues?.length).toBeGreaterThan(0);
      expect(result.lintIssues?.[0]?.code).toBe("OUT_OF_RANGE");
    });

    it("should return empty lintIssues when updating to a valid token", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>([["opacity.value", { $type: "opacity", $value: "1.5" }]]);
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.updateToken({
        tokenPath: "opacity.value",
        tokenData: { $type: "opacity", $value: "0.8" },
      });

      expect(result.updated).toBe(true);
      expect(result.lintIssues).toEqual([]);
    });
  });

  describe("deleteToken", () => {
    it("should return lintIssues for remaining tokens after deletion", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>([
        ["opacity.value", { $type: "opacity", $value: "0.5" }],
        ["opacity.invalid", { $type: "opacity", $value: "2.0" }],
      ]);
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.deleteToken({
        tokenPath: "opacity.value",
      });

      expect(result.lintIssues).toBeDefined();
      expect(result.lintIssues?.length).toBeGreaterThan(0);
      expect(result.lintIssues?.[0]?.tokenName).toBe("opacity.invalid");
      expect(result.lintIssues?.[0]?.code).toBe("OUT_OF_RANGE");
    });

    it("should return empty lintIssues when all remaining tokens are valid", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>([
        ["opacity.value", { $type: "opacity", $value: "0.5" }],
        ["opacity.valid", { $type: "opacity", $value: "0.8" }],
      ]);
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.deleteToken({
        tokenPath: "opacity.value",
      });

      expect(result.lintIssues).toEqual([]);
    });
  });

  describe("without linter", () => {
    it("should return undefined lintIssues when no linter is configured", () => {
      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens);

      const createResult = resolver.createToken({
        tokenPath: "test.token",
        tokenData: { $value: "value" },
      });

      expect(createResult.lintIssues).toBeUndefined();

      const updateResult = resolver.updateToken({
        tokenPath: "test.token",
        tokenData: { $value: "new value" },
      });

      expect(updateResult.lintIssues).toBeUndefined();

      const deleteResult = resolver.deleteToken({
        tokenPath: "test.token",
      });

      expect(deleteResult.lintIssues).toBeUndefined();
    });
  });
});
