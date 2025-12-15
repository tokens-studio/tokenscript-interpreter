import type { InterpreterResult } from "@interpreter/interpreter";
import { NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { BaseLintRule, type LintContext, type LintIssue, LintRunner, LintSeverity } from "@src/processor/linter";
import { describe, expect, it } from "vitest";

// Test rule that always produces an error
class AlwaysErrorRule extends BaseLintRule {
  id = "always-error";
  severity = LintSeverity.ERROR;

  validate(_value: InterpreterResult, context: LintContext): LintIssue[] {
    return [
      {
        code: "TEST_ERROR",
        severity: this.severity,
        message: "Always errors",
        tokenName: context.tokenName,
      },
    ];
  }
}

class StringWarningRule extends BaseLintRule {
  id = "string-warning";
  severity = LintSeverity.WARNING;

  validate(value: InterpreterResult, context: LintContext): LintIssue[] {
    if (value instanceof StringSymbol) {
      return [
        {
          code: "STRING_WARNING",
          severity: this.severity,
          message: `String value: ${value.value}`,
          tokenName: context.tokenName,
          data: {
            value: value.value,
          },
        },
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
      {
        code: "TYPE_SPECIFIC",
        severity: this.severity,
        message: `Token type: ${context.tokenType}`,
        tokenName: context.tokenName,
        data: {
          tokenType: context.tokenType,
        },
      },
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

  describe("linting multiple tokens", () => {
    it("should collect issues for a single token", () => {
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
      expect(issues[0].severity).toBe(LintSeverity.ERROR);
      expect(issues[1].severity).toBe(LintSeverity.WARNING);
      expect(issues[0].tokenName).toBe("test.token");
      expect(issues[1].tokenName).toBe("test.token");
    });

    it("should return issues for different tokens", () => {
      const runner = new LintRunner();
      runner.addRule(new StringWarningRule());

      const issues1 = runner.lintResult({
        tokenName: "token.one",
        tokenType: undefined,
        result: new StringSymbol("test1"),
        allTokens: new Map(),
      });

      const issues2 = runner.lintResult({
        tokenName: "token.two",
        tokenType: undefined,
        result: new StringSymbol("test2"),
        allTokens: new Map(),
      });

      expect(issues1).toHaveLength(1);
      expect(issues1[0].tokenName).toBe("token.one");

      expect(issues2).toHaveLength(1);
      expect(issues2[0].tokenName).toBe("token.two");
    });

    it("should return empty array when no issues", () => {
      const runner = new LintRunner();
      const issues = runner.lintResult({
        tokenName: "test.token",
        tokenType: undefined,
        result: new StringSymbol("test"),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
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
