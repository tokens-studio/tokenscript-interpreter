import { ColorSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { LintRunner, LintSeverity, type TokenTypeValidator, TypeBasedRule } from "@src/processor/linter";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

const colorValidator: TokenTypeValidator = (value, context, createIssue) => {
  // Valid if it's a ColorSymbol
  if (value instanceof ColorSymbol) {
    return [];
  }
  // Also accept strings that start with #
  if (value instanceof StringSymbol) {
    const strValue = value.value;
    if (!strValue.startsWith("#")) {
      return [
        createIssue({
          code: "INVALID_COLOR_FORMAT",
          severity: LintSeverity.ERROR,
          message: `Color must start with #`,
          tokenName: context.tokenName,
          data: {
            value: strValue,
          },
        }),
      ];
    }
    return [];
  }
  return [
    createIssue({
      code: "INVALID_COLOR_TYPE",
      severity: LintSeverity.ERROR,
      message: "Expected color value",
      tokenName: context.tokenName,
    }),
  ];
};

const opacityValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof NumberSymbol)) {
    return [
      createIssue({
        code: "INVALID_OPACITY_TYPE",
        severity: LintSeverity.ERROR,
        message: "Expected number for opacity",
        tokenName: context.tokenName,
      }),
    ];
  }
  const numValue = value.value;
  if (numValue < 0 || numValue > 1) {
    return [
      createIssue({
        code: "INVALID_OPACITY_RANGE",
        severity: LintSeverity.ERROR,
        message: `Opacity must be between 0 and 1`,
        tokenName: context.tokenName,
        data: { value: numValue },
      }),
    ];
  }
  return [];
};

const numberValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof NumberSymbol)) {
    return [
      createIssue({
        code: "INVALID_NUMBER_TYPE",
        severity: LintSeverity.ERROR,
        message: "Expected number",
        tokenName: context.tokenName,
      }),
    ];
  }
  if (value.value < 0) {
    return [
      createIssue({
        code: "NEGATIVE_NUMBER",
        severity: LintSeverity.WARNING,
        message: "Number should not be negative",
        tokenName: context.tokenName,
        data: { value: value.value },
      }),
    ];
  }
  return [];
};

function createTestLinter(): LintRunner {
  return new LintRunner().addRule(new TypeBasedRule().forType("color", colorValidator).forType("opacity", opacityValidator).forType("number", numberValidator));
}

describe("Linter Integration", () => {
  describe("processTokens with linter", () => {
    it("should return lint results when linter is provided", () => {
      const tokens = new Map<string, TokenData>([
        ["color.primary", { $value: "#ff0000", $type: "color" }],
        ["color.secondary", { $value: "invalid", $type: "color" }],
      ]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint).toBeDefined();
      expect(result.lint?.size).toBe(1);
      expect(result.lint?.get("color.secondary")).toHaveLength(1);
      expect(result.lint?.get("color.secondary")?.[0].code).toBe("INVALID_COLOR_FORMAT");
    });

    it("should not return lint results when no linter is provided", () => {
      const tokens = new Map<string, TokenData>([["color.primary", { $value: "#ff0000", $type: "color" }]]);

      const result = processTokens(tokens);

      expect(result.lint).toBeUndefined();
    });

    it("should aggregate errors and warnings correctly", () => {
      const tokens = new Map<string, TokenData>([
        ["color.bad", { $value: "invalid", $type: "color" }],
        ["opacity.bad", { $value: "1.5", $type: "opacity" }],
        ["number.negative", { $value: "-5", $type: "number" }],
      ]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint).toBeDefined();
      expect(result.lint?.size).toBe(3);
      expect(result.lint?.get("color.bad")).toHaveLength(1);
      expect(result.lint?.get("opacity.bad")).toHaveLength(1);
      expect(result.lint?.get("number.negative")).toHaveLength(1);
      expect(result.lint?.get("number.negative")?.[0].code).toBe("NEGATIVE_NUMBER");
      expect(result.lint?.get("number.negative")?.[0].severity).toBe(LintSeverity.WARNING);
    });

    it("should lint tokens with expressions", () => {
      const tokens = new Map<string, TokenData>([
        ["opacity.base", { $value: "0.5", $type: "opacity" }],
        ["opacity.double", { $value: "{opacity.base} * 3", $type: "opacity" }],
      ]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      // opacity.double resolves to 1.5 which is out of range
      expect(result.lint?.size).toBe(1);
      expect(result.lint?.get("opacity.double")).toHaveLength(1);
      expect(result.lint?.get("opacity.double")?.[0].code).toBe("INVALID_OPACITY_RANGE");
    });

    it("should not lint tokens that have errors", () => {
      const tokens = new Map<string, TokenData>([["opacity.bad", { $value: "{missing.ref}", $type: "opacity" }]]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      // Token has resolution error, so shouldn't be linted
      // Note: errors includes both the missing reference and the token that depends on it
      expect(result.errors.size).toBeGreaterThanOrEqual(1);
      expect(result.lint?.size || 0).toBe(0);
    });

    it("should lint primitive values", () => {
      const tokens = new Map<string, TokenData>([
        ["number.value", { $value: 42, $type: "number" }],
        ["number.negative", { $value: -10, $type: "number" }],
      ]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint?.size).toBe(1);
      expect(result.lint?.get("number.negative")).toHaveLength(1);
      expect(result.lint?.get("number.negative")?.[0].severity).toBe(LintSeverity.WARNING);
    });

    it("should handle tokens without $type", () => {
      const tokens = new Map<string, TokenData>([["some.token", { $value: "value" }]]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      // No type means no type-based validation
      expect(result.lint?.size || 0).toBe(0);
    });
  });

  describe("zero overhead when no linter", () => {
    it("should not include lintIssues in result when no linter", () => {
      const tokens = new Map<string, TokenData>([
        ["a", { $value: "1" }],
        ["b", { $value: "{a} + 1" }],
      ]);

      const result = processTokens(tokens);

      expect(result.lint).toBeUndefined();
      // Verify tokens still resolve correctly
      expect(result.tokens.get("b")).toBeDefined();
    });
  });

  describe("multiple tokens and validators", () => {
    it("should lint all tokens with their respective validators", () => {
      const tokens = new Map<string, TokenData>([
        ["color.valid", { $value: "#fff", $type: "color" }],
        ["color.invalid", { $value: "red", $type: "color" }],
        ["opacity.valid", { $value: "0.5", $type: "opacity" }],
        ["opacity.invalid", { $value: "2", $type: "opacity" }],
        ["number.valid", { $value: "10", $type: "number" }],
        ["number.warning", { $value: "-5", $type: "number" }],
        ["untyped.token", { $value: "anything" }],
      ]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint?.size).toBe(3);
      expect(result.lint?.get("color.invalid")?.[0].code).toBe("INVALID_COLOR_FORMAT");
      expect(result.lint?.get("opacity.invalid")?.[0].code).toBe("INVALID_OPACITY_RANGE");
      expect(result.lint?.get("number.warning")?.[0].code).toBe("NEGATIVE_NUMBER");

      // Check severities
      expect(result.lint?.get("color.invalid")?.[0].severity).toBe(LintSeverity.ERROR);
      expect(result.lint?.get("opacity.invalid")?.[0].severity).toBe(LintSeverity.ERROR);
      expect(result.lint?.get("number.warning")?.[0].severity).toBe(LintSeverity.WARNING);
    });
  });

  describe("lint issue data", () => {
    it("should include token name in issues", () => {
      const tokens = new Map<string, TokenData>([["my.special.token", { $value: "bad", $type: "color" }]]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint?.get("my.special.token")?.[0].tokenName).toBe("my.special.token");
    });

    it("should include custom data in issues", () => {
      const tokens = new Map<string, TokenData>([["opacity.bad", { $value: "1.5", $type: "opacity" }]]);

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint?.get("opacity.bad")?.[0].data).toEqual({ value: 1.5 });
    });
  });

  describe("record input format", () => {
    it("should work with record input", () => {
      const tokens = {
        color: {
          primary: { $value: "bad", $type: "color" },
        },
      };

      const linter = createTestLinter();
      const result = processTokens(tokens, { linter });

      expect(result.lint?.size).toBe(1);
      expect(result.lint?.get("color.primary")?.[0].tokenName).toBe("color.primary");
    });
  });
});
