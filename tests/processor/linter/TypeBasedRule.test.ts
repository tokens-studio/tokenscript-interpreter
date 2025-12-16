import type { InterpreterResult } from "@interpreter/interpreter";
import { ColorSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import {
  color,
  createValidator,
  css,
  type LintContext,
  LintRunner,
  LintSeverity,
  type TokenTypeValidator,
  TypeBasedRule,
  ValidatorCode,
} from "@src/processor/linter";
import { describe, expect, it } from "vitest";

// Use preset validators
const colorValidator = createValidator(color());
const opacityValidator = css.opacityValidator;

// Default validator - custom since there's no preset for this
const defaultValidator: TokenTypeValidator = (_value, context, createIssue) => {
  return createIssue({
    code: "DEFAULT_VALIDATOR",
    severity: LintSeverity.ERROR,
    message: `Unhandled type: ${context.tokenType}`,
    tokenName: context.tokenName,
    data: {
      tokenType: context.tokenType,
    },
  });
};

describe("TypeBasedRule", () => {
  describe("basic routing", () => {
    it("should route to correct validator by token type", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator).forType("opacity", opacityValidator);

      const runner = new LintRunner().addRule(rule);

      // Valid color (ColorSymbol)
      const colorIssues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new ColorSymbol("#ffffff"),
        allTokens: new Map(),
      });
      expect(colorIssues).toHaveLength(0);

      // Invalid color (not a ColorSymbol)
      const badColorIssues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("red"),
        allTokens: new Map(),
      });
      expect(badColorIssues).toHaveLength(1);
      expect(badColorIssues[0].code).toBe(ValidatorCode.EXPECTED_COLOR);

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
      expect(badOpacityIssues[0].code).toBe(ValidatorCode.VALUE_TOO_LARGE);
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
        result: new ColorSymbol("#ffffff"),
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

      // Invalid because it's a string, not a ColorSymbol
      const issues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("not-a-color-symbol"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(ValidatorCode.EXPECTED_COLOR);
    });
  });

  describe("issue creation", () => {
    it("should include code in issues", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator);

      const runner = new LintRunner().addRule(rule);

      // Invalid because it's a string, not a ColorSymbol
      const issues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("not-a-color-symbol"),
        allTokens: new Map(),
      });

      expect(issues[0].code).toBe(ValidatorCode.EXPECTED_COLOR);
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

      // Preset validators include constraint info in data
      expect(issues[0].data).toMatchObject({ value: 2, max: 1 });
    });

    it("should use ERROR severity by default", () => {
      const rule = new TypeBasedRule().forType("color", colorValidator);

      const runner = new LintRunner().addRule(rule);

      // Invalid because it's a string, not a ColorSymbol
      const issues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("not-a-color-symbol"),
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

  describe("flexible return types", () => {
    it("should handle single issue return", () => {
      const singleIssueValidator: TokenTypeValidator = (_value, context, createIssue) => {
        return createIssue({
          code: "SINGLE_ISSUE",
          severity: LintSeverity.ERROR,
          message: "Single issue",
          tokenName: context.tokenName,
        });
      };

      const rule = new TypeBasedRule().forType("test", singleIssueValidator);
      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("SINGLE_ISSUE");
    });

    it("should handle array of issues return", () => {
      const multiIssueValidator: TokenTypeValidator = (_value, context, createIssue) => {
        return [
          createIssue({
            code: "ISSUE_1",
            severity: LintSeverity.ERROR,
            message: "First issue",
            tokenName: context.tokenName,
          }),
          createIssue({
            code: "ISSUE_2",
            severity: LintSeverity.ERROR,
            message: "Second issue",
            tokenName: context.tokenName,
          }),
        ];
      };

      const rule = new TypeBasedRule().forType("test", multiIssueValidator);
      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(2);
      expect(issues[0].code).toBe("ISSUE_1");
      expect(issues[1].code).toBe("ISSUE_2");
    });

    it("should handle null return", () => {
      const nullValidator: TokenTypeValidator = () => {
        return null;
      };

      const rule = new TypeBasedRule().forType("test", nullValidator);
      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("should handle undefined return", () => {
      const undefinedValidator: TokenTypeValidator = () => {
        return undefined;
      };

      const rule = new TypeBasedRule().forType("test", undefinedValidator);
      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("should handle empty array return", () => {
      const emptyArrayValidator: TokenTypeValidator = () => {
        return [];
      };

      const rule = new TypeBasedRule().forType("test", emptyArrayValidator);
      const runner = new LintRunner().addRule(rule);

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: "test",
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });
  });

  describe("context access", () => {
    it("should provide access to all tokens in context", () => {
      let capturedContext: LintContext | undefined;

      const captureValidator: TokenTypeValidator = (_value, context, _createIssue) => {
        capturedContext = context;
        return null;
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
        return null;
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
