import { LintRunner, LintSeverity, penpot, TypeBasedRule, ValidatorCode } from "@src/processor/linter";
import { processTokens } from "@src/processor/process";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

/**
 * Helper to create a linter with structured token validators using presets
 */
function createStructuredTokenLinter(): LintRunner {
  return new LintRunner().addRule(new TypeBasedRule().forType("typography", penpot.typographyValidator).forType("shadow", penpot.shadowValidator));
}

describe("Structured Token Field-Level Linting", () => {
  describe("typography token validation", () => {
    it("should validate typography fields and return issues with paths", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // ❌ Negative font size (min: 0)
              lineHeight: "1.5", // ✓ Valid
              letterSpacing: "0.5", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      expect(result.issues).toBeDefined();
      expect(result.issues?.has("heading")).toBe(true);

      const issues = result.issues?.get("heading");
      expect(issues).toHaveLength(1);
      // fontSize uses or(number, numberWithUnit), returns the first error
      expect(issues?.[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(issues?.[0].path).toEqual(["fontSize"]);
    });

    it("should return multiple issues for multiple invalid fields", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // ❌ Negative (min: 0) - uses or()
              lineHeight: "-1", // ❌ Negative (min: 0) - direct number validator
              textCase: "invalid", // ❌ Not in allowed values
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("heading");
      expect(issues).toHaveLength(3);

      const fontSizeIssue = issues?.find((i) => i.path?.[0] === "fontSize");
      expect(fontSizeIssue?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);

      const lineHeightIssue = issues?.find((i) => i.path?.[0] === "lineHeight");
      expect(lineHeightIssue?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);

      const textCaseIssue = issues?.find((i) => i.path?.[0] === "textCase");
      expect(textCaseIssue?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });

    it("should handle mix of valid and invalid fields", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: {
              fontSize: "16", // ✓ Valid
              lineHeight: "-1", // ❌ Invalid (negative)
              letterSpacing: "1", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("text");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].path).toEqual(["lineHeight"]);
      expect(issues?.[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);
    });

    it("should validate textCase against allowed values", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "16",
              textCase: "uppercase", // Valid value
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      // Should have no issues
      expect(result.issues?.has("heading")).toBeFalsy();
    });

    it("should reject invalid textCase values", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "16",
              textCase: "invalid-case",
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("heading");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].path).toEqual(["textCase"]);
      expect(issues?.[0].code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });
  });

  describe("shadow token validation", () => {
    it("should validate shadow array with field paths", () => {
      const tokens = new Map<string, TokenData>([
        [
          "card-shadow",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0", // ✓ Valid
                offsetY: "4", // ✓ Valid
                blur: "-10", // ❌ Negative blur (min: 0) - uses or()
                spread: "0", // ✓ Valid
              },
            ],
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("card-shadow");
      expect(issues).toHaveLength(1);
      // blur uses or(number, numberWithUnit), returns the first error
      expect(issues?.[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      // Path includes array index and field name
      expect(issues?.[0].path).toEqual([0, "blur"]);
    });

    it("should validate multiple shadows in array", () => {
      const tokens = new Map<string, TokenData>([
        [
          "multi-shadow",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0",
                offsetY: "2",
                blur: "4",
                spread: "0",
              },
              {
                offsetX: "0",
                offsetY: "4",
                blur: "-8", // ❌ Invalid in second shadow
                spread: "-2", // ❌ Invalid spread (min: 0)
              },
            ],
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("multi-shadow");
      expect(issues).toHaveLength(2);

      const blurIssue = issues?.find((i) => i.path?.includes("blur"));
      expect(blurIssue?.path).toEqual([1, "blur"]);

      const spreadIssue = issues?.find((i) => i.path?.includes("spread"));
      expect(spreadIssue?.path).toEqual([1, "spread"]);
    });

    it("should validate all shadow fields", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadow",
          {
            $type: "shadow",
            $value: [
              {
                blur: "-10", // ❌ Negative blur
                spread: "-5", // ❌ Negative spread
              },
            ],
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("shadow");
      expect(issues).toHaveLength(2);

      const paths = issues?.map((i) => i.path?.[1]);
      expect(paths).toContain("blur");
      expect(paths).toContain("spread");
    });
  });

  describe("field validation with references", () => {
    it("should validate resolved field values from references", () => {
      const tokens = new Map<string, TokenData>([
        ["base.size", { $value: "-20", $type: "number" }],
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "{base.size}", // Resolves to -20 (invalid)
              lineHeight: "1.5",
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("heading");
      expect(issues).toHaveLength(1);
      // fontSize uses or(number, numberWithUnit)
      expect(issues?.[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(issues?.[0].path).toEqual(["fontSize"]);
    });

    it("should validate computed values from expressions", () => {
      const tokens = new Map<string, TokenData>([
        ["base", { $value: "10", $type: "number" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: [
              {
                blur: "{base} * -2", // Resolves to -20 (invalid)
                offsetX: "{base} * 2", // Resolves to 20 (valid)
              },
            ],
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("shadow");
      expect(issues).toHaveLength(1);
      // blur uses or(number, numberWithUnit)
      expect(issues?.[0].code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(issues?.[0].path).toEqual([0, "blur"]);
    });
  });

  describe("CRUD operations with structured token linting", () => {
    describe("createToken", () => {
      it("should return lint issues with paths when creating structured token", () => {
        const linter = createStructuredTokenLinter();
        const tokens = new Map<string, TokenData>();
        const resolver = new TokenResolver();
        resolver.build(tokens, undefined, undefined, linter);

        const result = resolver.createToken({
          tokenPath: "heading",
          tokenData: {
            $type: "typography",
            $value: {
              fontSize: "-16",
              lineHeight: "1.5",
            },
          },
        });

        expect(result.created).toBe(true);
        expect(result.issues).toBeDefined();
        expect(result.issues?.has("heading")).toBe(true);

        const issues = result.issues?.get("heading");
        expect(issues?.[0]).toHaveProperty("path", ["fontSize"]);
        // fontSize uses or(number, numberWithUnit)
        expect(issues?.[0]).toHaveProperty("code", ValidatorCode.VALUE_TOO_SMALL);
      });

      it("should return no lint issues for valid structured token", () => {
        const linter = createStructuredTokenLinter();
        const tokens = new Map<string, TokenData>();
        const resolver = new TokenResolver();
        resolver.build(tokens, undefined, undefined, linter);

        const result = resolver.createToken({
          tokenPath: "heading",
          tokenData: {
            $type: "typography",
            $value: {
              fontSize: "16",
              lineHeight: "1.5",
            },
          },
        });

        expect(result.created).toBe(true);
        expect(result.issues).toBeUndefined();
      });
    });

    describe("updateToken", () => {
      it("should return lint issues with paths when updating to invalid values", () => {
        const linter = createStructuredTokenLinter();
        const tokens = new Map<string, TokenData>([
          [
            "heading",
            {
              $type: "typography",
              $value: {
                fontSize: "16",
                lineHeight: "1.5",
              },
            },
          ],
        ]);

        const resolver = new TokenResolver();
        resolver.build(tokens, undefined, undefined, linter);

        const result = resolver.updateToken({
          tokenPath: "heading",
          tokenData: {
            $type: "typography",
            $value: {
              fontSize: "-20",
              lineHeight: "1.5",
            },
          },
        });

        expect(result.updated).toBe(true);
        expect(result.issues?.has("heading")).toBe(true);

        const issues = result.issues?.get("heading");
        const fontSizeIssue = issues?.find((i: any) => i.path?.[0] === "fontSize");
        expect(fontSizeIssue).toHaveProperty("path", ["fontSize"]);
        // fontSize uses or(number, numberWithUnit)
        expect(fontSizeIssue).toHaveProperty("code", ValidatorCode.VALUE_TOO_SMALL);
      });

      it("should clear lint issues when updating to valid values", () => {
        const linter = createStructuredTokenLinter();
        const tokens = new Map<string, TokenData>([
          [
            "heading",
            {
              $type: "typography",
              $value: {
                fontSize: "-16",
                lineHeight: "1.5",
              },
            },
          ],
        ]);

        const resolver = new TokenResolver();
        resolver.build(tokens, undefined, undefined, linter);

        const result = resolver.updateToken({
          tokenPath: "heading",
          tokenData: {
            $type: "typography",
            $value: {
              fontSize: "16",
              lineHeight: "1.5",
            },
          },
        });

        expect(result.updated).toBe(true);
        expect(result.issues).toBeUndefined();
      });

      it("should return multiple field issues when updating", () => {
        const linter = createStructuredTokenLinter();
        const tokens = new Map<string, TokenData>([
          [
            "heading",
            {
              $type: "typography",
              $value: {
                fontSize: "16",
                lineHeight: "1.5",
                textCase: "none",
              },
            },
          ],
        ]);

        const resolver = new TokenResolver();
        resolver.build(tokens, undefined, undefined, linter);

        const result = resolver.updateToken({
          tokenPath: "heading",
          tokenData: {
            $type: "typography",
            $value: {
              fontSize: "-16",
              lineHeight: "1.5",
              textCase: "invalid",
            },
          },
        });

        expect(result.updated).toBe(true);
        const issues = result.issues?.get("heading");
        expect(issues).toHaveLength(2);

        const paths = issues?.map((i: any) => i.path?.[0]);
        expect(paths).toContain("fontSize");
        expect(paths).toContain("textCase");
      });
    });

    describe("deleteToken", () => {
      it("should re-lint remaining tokens after deletion", () => {
        const linter = createStructuredTokenLinter();
        const tokens = new Map<string, TokenData>([
          [
            "heading",
            {
              $type: "typography",
              $value: {
                fontSize: "16",
                lineHeight: "1.5",
              },
            },
          ],
          [
            "body",
            {
              $type: "typography",
              $value: {
                fontSize: "-12",
                lineHeight: "1.4",
              },
            },
          ],
        ]);

        const resolver = new TokenResolver();
        resolver.build(tokens, undefined, undefined, linter);

        const result = resolver.deleteToken({
          tokenPath: "heading",
        });

        // Should still have lint issue for body
        expect(result.issues?.has("body")).toBe(true);
        expect(result.issues?.has("heading")).toBe(false);

        const bodyIssues = result.issues?.get("body");
        expect(bodyIssues?.[0]).toHaveProperty("path", ["fontSize"]);
      });
    });
  });

  describe("form use cases", () => {
    it("should provide field paths for form highlighting", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // Error
              lineHeight: "-1", // Error
              letterSpacing: "0", // Valid
              fontWeight: "bold", // Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("heading");
      expect(issues).toHaveLength(2);

      // Build field validation map for form
      const fieldValidation = new Map<string, { valid: boolean; severity?: LintSeverity; message?: string }>();

      const fields = ["fontSize", "lineHeight", "letterSpacing", "fontWeight"];
      for (const field of fields) {
        const fieldIssue = issues?.find((i) => i.path?.[0] === field);
        if (fieldIssue) {
          fieldValidation.set(field, {
            valid: false,
            severity: fieldIssue.severity,
            message: fieldIssue.message,
          });
        } else {
          fieldValidation.set(field, { valid: true });
        }
      }

      expect(fieldValidation.get("fontSize")?.valid).toBe(false);
      expect(fieldValidation.get("fontSize")?.severity).toBe(LintSeverity.ERROR);

      expect(fieldValidation.get("lineHeight")?.valid).toBe(false);
      expect(fieldValidation.get("lineHeight")?.severity).toBe(LintSeverity.ERROR);

      expect(fieldValidation.get("letterSpacing")?.valid).toBe(true);
      expect(fieldValidation.get("fontWeight")?.valid).toBe(true);
    });

    it("should allow incremental validation during form editing", () => {
      const linter = createStructuredTokenLinter();
      const tokens = new Map<string, TokenData>();
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      // User creates initial token
      const create = resolver.createToken({
        tokenPath: "heading",
        tokenData: {
          $type: "typography",
          $value: {
            fontSize: "16",
            lineHeight: "1.5",
          },
        },
      });

      expect(create.issues).toBeUndefined();

      // User edits fontSize to invalid value
      const update1 = resolver.updateToken({
        tokenPath: "heading",
        tokenData: {
          $type: "typography",
          $value: {
            fontSize: "-16",
            lineHeight: "1.5",
          },
        },
      });

      const issues1 = update1.issues?.get("heading");
      expect(issues1?.find((i: any) => i.path?.[0] === "fontSize")).toBeDefined();

      // User fixes fontSize but breaks lineHeight
      const update2 = resolver.updateToken({
        tokenPath: "heading",
        tokenData: {
          $type: "typography",
          $value: {
            fontSize: "16",
            lineHeight: "-1",
          },
        },
      });

      const issues2 = update2.issues?.get("heading");
      expect(issues2?.find((i: any) => i.path?.[0] === "fontSize")).toBeUndefined();
      expect(issues2?.find((i: any) => i.path?.[0] === "lineHeight")).toBeDefined();

      // User fixes everything
      const update3 = resolver.updateToken({
        tokenPath: "heading",
        tokenData: {
          $type: "typography",
          $value: {
            fontSize: "16",
            lineHeight: "1.5",
          },
        },
      });

      expect(update3.issues).toBeUndefined();
    });
  });

  describe("accessing issues by field path", () => {
    it("should filter issues by specific field", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16",
              lineHeight: "-1",
              textCase: "invalid",
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const allIssues = result.issues?.get("heading");

      // Get issues for specific field
      const fontSizeIssues = allIssues?.filter((i) => i.path?.[0] === "fontSize");
      const lineHeightIssues = allIssues?.filter((i) => i.path?.[0] === "lineHeight");
      const textCaseIssues = allIssues?.filter((i) => i.path?.[0] === "textCase");

      expect(fontSizeIssues).toHaveLength(1);
      expect(lineHeightIssues).toHaveLength(1);
      expect(textCaseIssues).toHaveLength(1);
    });

    it("should identify all errors by severity", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // Error
              lineHeight: "-1", // Error
              textCase: "invalid", // Error
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.issues?.get("heading");

      const errorCount = issues?.filter((i) => i.severity === LintSeverity.ERROR).length;

      expect(errorCount).toBe(3);
    });
  });
});
