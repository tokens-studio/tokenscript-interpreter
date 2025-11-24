import type { InterpreterResult } from "@interpreter/interpreter";
import { NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { type LintContext, LintRunner, LintSeverity, type TokenTypeValidator, TypeBasedRule } from "@src/processor/linter";
import { describe, expect, it } from "vitest";

const colorValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof StringSymbol)) {
    return [createIssue(context, "INVALID_COLOR", "Expected string for color")];
  }
  const strValue = value.value;
  if (!strValue.startsWith("#")) {
    return [
      createIssue(context, "INVALID_COLOR_FORMAT", `Color must start with #: ${strValue}`, {
        value: strValue,
      }),
    ];
  }
  return [];
};

const opacityValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof NumberSymbol)) {
    return [createIssue(context, "INVALID_OPACITY_TYPE", "Expected number for opacity")];
  }
  const numValue = value.value;
  if (numValue < 0 || numValue > 1) {
    return [
      createIssue(context, "INVALID_OPACITY_RANGE", `Opacity must be 0-1: ${numValue}`, {
        value: numValue,
        min: 0,
        max: 1,
      }),
    ];
  }
  return [];
};

const defaultValidator: TokenTypeValidator = (_value, context, createIssue) => {
  return [
    createIssue(context, "DEFAULT_VALIDATOR", `Unhandled type: ${context.tokenType}`, {
      tokenType: context.tokenType,
    }),
  ];
};

describe("TypeBasedRule", () => {
  describe("basic routing", () => {
    it("should route to correct validator by token type", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator).forType("opacity", opacityValidator);

      const runner = new LintRunner().addRule(rule);

      // Valid color
      const colorIssues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("#fff"),
        allTokens: new Map(),
      });
      expect(colorIssues).toHaveLength(0);

      // Invalid color format
      const badColorIssues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("red"),
        allTokens: new Map(),
      });
      expect(badColorIssues).toHaveLength(1);
      expect(badColorIssues[0].code).toBe("INVALID_COLOR_FORMAT");

      // Valid opacity
      const opacityIssues = runner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(0.5),
        allTokens: new Map(),
      });
      expect(opacityIssues).toHaveLength(0);

      // Invalid opacity range
      const badOpacityIssues = runner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(1.5),
        allTokens: new Map(),
      });
      expect(badOpacityIssues).toHaveLength(1);
      expect(badOpacityIssues[0].code).toBe("INVALID_OPACITY_RANGE");
    });

    it("should return no issues for unregistered token types", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.number",
        tokenType: "number",
        result: new NumberSymbol(42),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("should return no issues when token type is undefined", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("#fff"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });
  });

  describe("default validator", () => {
    it("should use default validator for unregistered types", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator).forDefault(defaultValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.spacing",
        tokenType: "spacing",
        result: new NumberSymbol(16),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("DEFAULT_VALIDATOR");
      expect(issues[0].data?.tokenType).toBe("spacing");
    });

    it("should prefer specific validator over default", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator).forDefault(defaultValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("invalid"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("INVALID_COLOR_FORMAT");
    });
  });

  describe("issue creation", () => {
    it("should include correct rule id in issues", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("invalid"),
        allTokens: new Map(),
      });

      expect(issues[0].ruleId).toBe("type-validation");
    });

    it("should include data in issues", () => {
      const rule = new TypeBasedRule().forType("opacity", opacityValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(2),
        allTokens: new Map(),
      });

      expect(issues[0].data).toEqual({ value: 2, min: 0, max: 1 });
    });

    it("should use ERROR severity by default", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator);

      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("invalid"),
        allTokens: new Map(),
      });

      expect(issues[0].severity).toBe(LintSeverity.ERROR);
    });
  });

  describe("fluent API", () => {
    it("should support chaining forType calls", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator).forType("opacity", opacityValidator).forDefault(defaultValidator);

      expect(rule.severity).toBe(LintSeverity.ERROR);
    });
  });

  describe("context access", () => {
    it("should provide access to all tokens in context", () => {
      let capturedContext: LintContext | undefined;

      const captureValidator: TokenTypeValidator = (_value, context, _createIssue) => {
        capturedContext = context;
        return [];
      };

      const rule = new TypeBasedRule().forType("test", captureValidator);
      const runner = new LintRunner().addRule(rule);

      const allTokens = new Map<string, unknown>([
        ["token.a", "value-a"],
        ["token.b", "value-b"],
      ]);

      runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens,
      });

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.tokenName).toBe("test.token");
      expect(capturedContext?.tokenType).toBe("test");
      expect(capturedContext?.allTokens.size).toBe(2);
    });

    it("should provide access to resolved tokens", () => {
      let capturedContext: LintContext | undefined;

      const captureValidator: TokenTypeValidator = (_value, context, _createIssue) => {
        capturedContext = context;
        return [];
      };

      const rule = new TypeBasedRule().forType("test", captureValidator);
      const runner = new LintRunner().addRule(rule);

      const resolvedTokens = new Map<string, InterpreterResult>([["resolved.a", new StringSymbol("a")]]);

      runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens: new Map(),
        resolvedTokens,
      });

      expect(capturedContext?.resolvedTokens?.size).toBe(1);
    });
  });
});
