import { NumberSymbol } from "@interpreter/symbols";
import { LintRunner, TypeBasedRule } from "@src/processor/linter";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver - CRUD with Linter", () => {
  const createOpacityValidator = () => {
    return (value: any, context: any, createIssue: any) => {
      if (!(value instanceof NumberSymbol)) {
        return createIssue({
          code: "INVALID_TYPE",
          severity: "error",
          message: "Expected number",
          tokenName: context.tokenName,
        });
      }
      if (value.value < 0 || value.value > 1) {
        return createIssue({
          code: "OUT_OF_RANGE",
          severity: "error",
          message: "Opacity must be between 0 and 1",
          tokenName: context.tokenName,
        });
      }
      return null;
    };
  };

  describe("createToken", () => {
    it("should return issues when creating a token with validation errors", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.createToken({
        tokenPath: "opacity.invalid",
        tokenData: { $type: "opacity", $value: "2.5" },
      });

      expect(result.created).toBe(true);
      expect(result.issues).toBeDefined();
      expect(result.issues?.get("opacity.invalid")).toBeDefined();
      expect(result.issues?.get("opacity.invalid")?.[0]).toHaveProperty("code", "OUT_OF_RANGE");
    });

    it("should return empty issues when creating a valid token", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.createToken({
        tokenPath: "opacity.valid",
        tokenData: { $type: "opacity", $value: "0.5" },
      });

      expect(result.created).toBe(true);
      expect(result.issues).toBeUndefined();
    });
  });

  describe("updateToken", () => {
    it("should return issues when updating a token with validation errors", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>([["opacity.value", { $type: "opacity", $value: "0.5" }]]);
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.updateToken({
        tokenPath: "opacity.value",
        tokenData: { $type: "opacity", $value: "1.5" },
      });

      expect(result.updated).toBe(true);
      expect(result.issues).toBeDefined();
      expect(result.issues?.get("opacity.value")).toBeDefined();
      expect(result.issues?.get("opacity.value")?.[0]).toHaveProperty("code", "OUT_OF_RANGE");
    });

    it("should return empty issues when updating to a valid token", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("opacity", createOpacityValidator()));

      const tokens = new Map<string, TokenData>([["opacity.value", { $type: "opacity", $value: "1.5" }]]);
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.updateToken({
        tokenPath: "opacity.value",
        tokenData: { $type: "opacity", $value: "0.8" },
      });

      expect(result.updated).toBe(true);
      expect(result.issues).toBeUndefined();
    });
  });

  describe("deleteToken", () => {
    it("should return issues for remaining tokens after deletion", () => {
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

      expect(result.issues).toBeDefined();
      expect(result.issues?.get("opacity.invalid")).toBeDefined();
      expect(result.issues?.get("opacity.invalid")?.[0]).toHaveProperty("code", "OUT_OF_RANGE");
    });

    it("should return empty issues when all remaining tokens are valid", () => {
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

      expect(result.issues).toBeUndefined();
    });
  });

  describe("without linter", () => {
    it("should return undefined issues when no linter is configured", () => {
      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens);

      const createResult = resolver.createToken({
        tokenPath: "test.token",
        tokenData: { $value: "value" },
      });

      expect(createResult.issues).toBeUndefined();

      const updateResult = resolver.updateToken({
        tokenPath: "test.token",
        tokenData: { $value: "new value" },
      });

      expect(updateResult.issues).toBeUndefined();

      const deleteResult = resolver.deleteToken({
        tokenPath: "test.token",
      });

      expect(deleteResult.issues).toBeUndefined();
    });
  });
});
