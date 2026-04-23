import { TokenResolver } from "@src/processor";
import { validateTokenName, validateTokenPath } from "@src/processor/utils/name-validation";
import type { TokenData } from "@src/processor/utils/tokens";
import { ValidationSeverity } from "@src/processor/validator";
import { describe, expect, it } from "vitest";

describe("name-validation", () => {
  describe("validateTokenName", () => {
    it("accepts simple names", () => {
      expect(validateTokenName("color")).toBe(true);
      expect(validateTokenName("primary")).toBe(true);
      expect(validateTokenName("Bg_Color")).toBe(true);
      expect(validateTokenName("spacing-lg")).toBe(true);
      expect(validateTokenName("100")).toBe(true);
    });

    it("accepts unicode names", () => {
      expect(validateTokenName("farbe")).toBe(true);
      expect(validateTokenName("primär")).toBe(true);
      expect(validateTokenName("色")).toBe(true);
      expect(validateTokenName("🔴")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(validateTokenName("")).toBe(false);
    });

    it("rejects names with spaces", () => {
      expect(validateTokenName("Bg Color")).toBe(false);
      expect(validateTokenName("  leading")).toBe(false);
      expect(validateTokenName("trailing  ")).toBe(false);
    });

    it("rejects names with braces", () => {
      expect(validateTokenName("color{primary}")).toBe(false);
      expect(validateTokenName("nested{ref}inside")).toBe(false);
      expect(validateTokenName("mid {brace")).toBe(false);
    });

    it("rejects names with brackets", () => {
      expect(validateTokenName("my[token]")).toBe(false);
      expect(validateTokenName("bracket]end")).toBe(false);
    });

    it("rejects names with tabs and newlines", () => {
      expect(validateTokenName("tab\there")).toBe(false);
      expect(validateTokenName("color\n")).toBe(false);
    });
  });

  describe("validateTokenPath", () => {
    it("accepts valid dot-separated paths", () => {
      expect(validateTokenPath("color.primary")).toBe(true);
      expect(validateTokenPath("a.b.c.d")).toBe(true);
      expect(validateTokenPath("font-size.base")).toBe(true);
    });

    it("rejects paths with invalid segments", () => {
      expect(validateTokenPath("color.Bg Color")).toBe(false);
      expect(validateTokenPath("with space.in-segment")).toBe(false);
    });
  });

  describe("TokenResolver emits INVALID_TOKEN_NAME", () => {
    it("flags a token with a space in its name", () => {
      const resolver = new TokenResolver();
      const tokens = new Map<string, TokenData>([
        ["color.primary", { $value: "#0066CC", $type: "color" }],
        ["invalid space name", { $value: "#ff0000", $type: "color" }],
      ]);

      const result = resolver.processTokens(tokens);

      // Valid token should have no issues
      expect(result.issues?.get("color.primary")).toBeUndefined();

      // Invalid token should have INVALID_TOKEN_NAME issue
      const issues = result.issues?.get("invalid space name");
      expect(issues).toBeDefined();
      expect(issues!.length).toBeGreaterThanOrEqual(1);
      const nameIssue = issues!.find((i) => "code" in i && i.code === "INVALID_TOKEN_NAME");
      expect(nameIssue).toBeDefined();
      expect(nameIssue!).toMatchObject({
        code: "INVALID_TOKEN_NAME",
        severity: ValidationSeverity.ERROR,
      });
    });

    it("flags a token with braces in its name", () => {
      const resolver = new TokenResolver();
      const tokens = new Map<string, TokenData>([["color{primary}", { $value: "#ff0000", $type: "color" }]]);

      const result = resolver.processTokens(tokens);

      const issues = result.issues?.get("color{primary}");
      expect(issues).toBeDefined();
      const nameIssue = issues!.find((i) => "code" in i && i.code === "INVALID_TOKEN_NAME");
      expect(nameIssue).toBeDefined();
    });

    it("flags a token with an invalid segment in a dotted path", () => {
      const resolver = new TokenResolver();
      const tokens = new Map<string, TokenData>([["color.Bg Color", { $value: "#ff0000", $type: "color" }]]);

      const result = resolver.processTokens(tokens);

      const issues = result.issues?.get("color.Bg Color");
      expect(issues).toBeDefined();
      const nameIssue = issues!.find((i) => "code" in i && i.code === "INVALID_TOKEN_NAME");
      expect(nameIssue).toBeDefined();
    });

    it("does not flag valid token names", () => {
      const resolver = new TokenResolver();
      const tokens = new Map<string, TokenData>([
        ["color.primary", { $value: "#0066CC", $type: "color" }],
        ["spacing-lg", { $value: "24px", $type: "dimension" }],
        ["Bg_Color", { $value: "#ffffff", $type: "color" }],
      ]);

      const result = resolver.processTokens(tokens);

      expect(result.issues?.get("color.primary")).toBeUndefined();
      expect(result.issues?.get("spacing-lg")).toBeUndefined();
      expect(result.issues?.get("Bg_Color")).toBeUndefined();
    });
  });
});
