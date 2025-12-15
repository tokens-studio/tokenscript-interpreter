import { NumberSymbol } from "@interpreter/symbols";
import { all, createValidator, css, LintRunner, LintSeverity, number, penpot, TypeBasedRule, ValidatorCode } from "@src/processor/linter";
import { describe, expect, it } from "vitest";

describe("LintRunner extension", () => {
  describe("css.createLintRunner()", () => {
    it("creates a runner with all CSS rules", () => {
      const runner = css.createLintRunner();

      const issues = runner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(1.5),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(ValidatorCode.VALUE_TOO_LARGE);
    });

    it("validates border-radius tokens", () => {
      const runner = css.createLintRunner();

      const issues = runner.lintResult({
        tokenName: "test.radius",
        tokenType: "border-radius",
        result: new NumberSymbol(-5),
        allTokens: new Map(),
      });

      // border-radius uses lengthPercentageNonNegative which uses or() combinator
      // so it returns NO_VALIDATOR_MATCHED when value doesn't match any option
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
    });
  });

  describe("penpot.createLintRunner()", () => {
    it("creates a runner with Penpot rules extending CSS", () => {
      const runner = penpot.createLintRunner();

      // Should have CSS opacity rule
      const opacityIssues = runner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(1.5),
        allTokens: new Map(),
      });

      expect(opacityIssues).toHaveLength(1);
      expect(opacityIssues[0].code).toBe(ValidatorCode.VALUE_TOO_LARGE);

      // Should have Penpot stroke-width rule (not in CSS)
      const strokeIssues = runner.lintResult({
        tokenName: "test.stroke",
        tokenType: "stroke-width",
        result: new NumberSymbol(-1),
        allTokens: new Map(),
      });

      expect(strokeIssues).toHaveLength(1);
      expect(strokeIssues[0].code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
    });
  });

  describe("LintRunner.extend()", () => {
    it("adds new validators to the runner", () => {
      const baseRunner = css.createLintRunner();

      const customValidator = createValidator(number({ min: 0 }));
      const extendedRunner = baseRunner.extend({
        "custom-type": customValidator,
      });

      // New type should be validated
      const issues = extendedRunner.lintResult({
        tokenName: "test.custom",
        tokenType: "custom-type",
        result: new NumberSymbol(-5),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);
    });

    it("overrides existing validators", () => {
      const baseRunner = css.createLintRunner();

      // Override opacity to allow any number (no constraints)
      const customValidator = createValidator(number());
      const extendedRunner = baseRunner.extend({
        opacity: customValidator,
      });

      // Should now pass validation (no min/max)
      const issues = extendedRunner.lintResult({
        tokenName: "test.opacity",
        tokenType: "opacity",
        result: new NumberSymbol(999),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("preserves non-overridden rules", () => {
      const baseRunner = css.createLintRunner();

      const extendedRunner = baseRunner.extend({
        "custom-type": createValidator(number()),
      });

      // border-radius should still be validated
      const issues = extendedRunner.lintResult({
        tokenName: "test.radius",
        tokenType: "border-radius",
        result: new NumberSymbol(-5),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
    });

    it("returns a new runner (immutable)", () => {
      const baseRunner = css.createLintRunner();
      const extendedRunner = baseRunner.extend({
        "new-type": createValidator(number()),
      });

      expect(extendedRunner).not.toBe(baseRunner);

      // Original runner should not have the new type
      const baseIssues = baseRunner.lintResult({
        tokenName: "test",
        tokenType: "new-type",
        result: new NumberSymbol(-5),
        allTokens: new Map(),
      });

      expect(baseIssues).toHaveLength(0);
    });
  });

  describe("all() combinator", () => {
    it("runs all validators and collects issues", () => {
      const _minValidator = createValidator(number({ min: 0 }));
      const _maxValidator = createValidator(number({ max: 100 }));
      const combinedValidator = createValidator(all(number({ min: 0 }), number({ max: 100 })));

      const runner = new LintRunner().addRule(new TypeBasedRule({ "custom-type": combinedValidator }));

      // Value too small
      const smallIssues = runner.lintResult({
        tokenName: "test",
        tokenType: "custom-type",
        result: new NumberSymbol(-5),
        allTokens: new Map(),
      });

      expect(smallIssues).toHaveLength(1);
      expect(smallIssues[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);

      // Value too large
      const largeIssues = runner.lintResult({
        tokenName: "test",
        tokenType: "custom-type",
        result: new NumberSymbol(150),
        allTokens: new Map(),
      });

      expect(largeIssues).toHaveLength(1);
      expect(largeIssues[0].code).toBe(ValidatorCode.VALUE_TOO_LARGE);
    });

    it("passes when all validators pass", () => {
      const combinedValidator = createValidator(all(number({ min: 0 }), number({ max: 100 })));

      const runner = new LintRunner().addRule(new TypeBasedRule({ "custom-type": combinedValidator }));

      const issues = runner.lintResult({
        tokenName: "test",
        tokenType: "custom-type",
        result: new NumberSymbol(50),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(0);
    });

    it("can combine preset validators with custom validators", () => {
      // Custom error code for this test (not in ValidatorCode enum)
      const CUSTOM_NOT_INTEGER = "CUSTOM_NOT_INTEGER";

      // Custom validator that only allows integers
      const _integerValidator = createValidator((value, ctx) => {
        if (value instanceof NumberSymbol && !Number.isInteger(value.value)) {
          return {
            code: CUSTOM_NOT_INTEGER,
            severity: LintSeverity.ERROR,
            message: "Value must be an integer",
            tokenName: ctx.tokenName,
          };
        }
        return null;
      });

      const combinedValidator = createValidator(
        all(number({ min: 0, max: 100 }), (value, ctx) => {
          if (value instanceof NumberSymbol && !Number.isInteger(value.value)) {
            return {
              code: CUSTOM_NOT_INTEGER,
              severity: ctx.severity,
              message: "Value must be an integer",
              tokenName: ctx.tokenName,
            };
          }
          return null;
        }),
      );

      const runner = css.createLintRunner().extend({
        opacity: combinedValidator,
      });

      // Decimal in valid range should fail (not integer)
      const issues = runner.lintResult({
        tokenName: "test",
        tokenType: "opacity",
        result: new NumberSymbol(0.5),
        allTokens: new Map(),
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(CUSTOM_NOT_INTEGER);
    });
  });

  describe("chained extension", () => {
    it("allows multiple extensions", () => {
      const runner1 = css.createLintRunner();
      const runner2 = runner1.extend({
        "type-a": createValidator(number({ min: 0 })),
      });
      const runner3 = runner2.extend({
        "type-b": createValidator(number({ max: 100 })),
      });

      // runner3 should have CSS rules + type-a + type-b
      const typeAIssues = runner3.lintResult({
        tokenName: "test",
        tokenType: "type-a",
        result: new NumberSymbol(-5),
        allTokens: new Map(),
      });
      expect(typeAIssues).toHaveLength(1);

      const typeBIssues = runner3.lintResult({
        tokenName: "test",
        tokenType: "type-b",
        result: new NumberSymbol(150),
        allTokens: new Map(),
      });
      expect(typeBIssues).toHaveLength(1);

      const opacityIssues = runner3.lintResult({
        tokenName: "test",
        tokenType: "opacity",
        result: new NumberSymbol(1.5),
        allTokens: new Map(),
      });
      expect(opacityIssues).toHaveLength(1);
    });
  });
});
