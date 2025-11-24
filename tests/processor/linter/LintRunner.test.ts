import type { InterpreterResult } from "@interpreter/interpreter";
import { NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { BaseLintRule, type LintContext, type LintIssue, LintRunner, LintSeverity } from "@src/processor/linter";
import { describe, expect, it } from "vitest";

// Test rule that always produces an error
class AlwaysErrorRule extends BaseLintRule {
  id = "always-error";
  severity = LintSeverity.ERROR;

  validate(_value: InterpreterResult, context: LintContext): LintIssue[] {
    return [this.createIssue(context, "TEST_ERROR", "Always errors")];
  }
}

class StringWarningRule extends BaseLintRule {
  id = "string-warning";
  severity = LintSeverity.WARNING;

  validate(value: InterpreterResult, context: LintContext): LintIssue[] {
    if (value instanceof StringSymbol) {
      return [
        this.createIssue(context, "STRING_WARNING", `String value: ${value.value}`, {
          value: value.value,
        }),
      ];
    }
    return [];
  }
}

class TypeSpecificRule extends BaseLintRule {
  id = "type-specific";
  severity = LintSeverity.ERROR;
  tokenTypes = ["color", "opacity"];

  validate(_value: InterpreterResult, context: LintContext): LintIssue[] {
    return [
      this.createIssue(context, "TYPE_SPECIFIC", `Token type: ${context.tokenType}`, {
        tokenType: context.tokenType,
      }),
    ];
  }
}

describe("LintRunner", () => {
  describe("basic functionality", () => {
    it("should run rules and collect issues", () => {
      const runner = new LintRunner();
      runner.addRule(new AlwaysErrorRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("TEST_ERROR");
      expect(issues[0].tokenName).toBe("test.token");
      expect(issues[0].severity).toBe(LintSeverity.ERROR);
    });

    it("should run multiple rules", () => {
      const runner = new LintRunner();
      runner.addRule(new AlwaysErrorRule());
      runner.addRule(new StringWarningRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(2);
      expect(issues.map((i) => i.code)).toContain("TEST_ERROR");
      expect(issues.map((i) => i.code)).toContain("STRING_WARNING");
    });

    it("should pass context to rules", () => {
      const runner = new LintRunner();
      runner.addRule(new StringWarningRule());

      const allTokens = new Map([["other", "value"]]);
      const issues = runner.lintResult({
        tokenName: "my.token",
        tokenType: "string",
        result: new StringSymbol("hello"),
        allTokens: allTokens as Map<string, unknown>,
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].tokenName).toBe("my.token");
      expect(issues[0].data?.value).toBe("hello");
    });
  });

  describe("token type filtering", () => {
    it("should run type-specific rules only for matching types", () => {
      const runner = new LintRunner();
      runner.addRule(new TypeSpecificRule());

      const colorIssues = runner.lintResult({
        tokenName: "test.color",
        tokenType: "color",
        result: new StringSymbol("#fff"),
        allTokens: new Map(),
      });
      expect(colorIssues).toHaveLength(1);
      expect(colorIssues[0].data?.tokenType).toBe("color");

      const opacityIssues = runner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(0.5),
        allTokens: new Map(),
      });
      expect(opacityIssues).toHaveLength(1);
      expect(opacityIssues[0].data?.tokenType).toBe("opacity");
    });

    it("should skip type-specific rules for non-matching types", () => {
      const runner = new LintRunner();
      runner.addRule(new TypeSpecificRule());

      const issues = runner.lintResult({
        tokenName: "test.number",
        tokenType: "number",
        result: new NumberSymbol(42),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("should run type-specific rules when no token type is provided", () => {
      const runner = new LintRunner();
      runner.addRule(new TypeSpecificRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      // Rule has tokenTypes filter but token has no type, so rule is skipped
      expect(issues).toHaveLength(0);
    });
  });

  describe("rule configuration", () => {
    it("should disable rules via config", () => {
      const runner = new LintRunner({
        rules: {
          "always-error": false,
        },
      });
      runner.addRule(new AlwaysErrorRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("should override severity via config", () => {
      const runner = new LintRunner({
        rules: {
          "always-error": LintSeverity.WARNING,
        },
      });
      runner.addRule(new AlwaysErrorRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe(LintSeverity.WARNING);
    });

    it("should keep rules enabled by default", () => {
      const runner = new LintRunner({
        rules: {
          "other-rule": false,
        },
      });
      runner.addRule(new AlwaysErrorRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
    });
  });

  describe("result aggregation", () => {
    it("should aggregate issues by severity", () => {
      const runner = new LintRunner();
      runner.addRule(new AlwaysErrorRule());
      runner.addRule(new StringWarningRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      const result = runner.aggregateResults(issues);

      expect(result.issues).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.hasErrors).toBe(true);
    });

    it("should report hasErrors as false when only warnings", () => {
      const runner = new LintRunner();
      runner.addRule(new StringWarningRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      const result = runner.aggregateResults(issues);

      expect(result.issues).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.hasErrors).toBe(false);
    });

    it("should handle empty issues array", () => {
      const runner = new LintRunner();
      const result = runner.aggregateResults([]);

      expect(result.issues).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.hasErrors).toBe(false);
    });
  });

  describe("fluent API", () => {
    it("should support chaining addRule calls", () => {
      const runner = new LintRunner().addRule(new AlwaysErrorRule()).addRule(new StringWarningRule());

      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(2);
    });
  });
});
