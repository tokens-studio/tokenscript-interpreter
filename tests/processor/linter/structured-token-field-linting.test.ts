import { NumberSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import type { LintIssue } from "@src/processor/linter";
import { LintRunner, LintSeverity, TypeBasedRule } from "@src/processor/linter";
import type { TokenTypeValidator } from "@src/processor/linter/rules/TypeBasedRule";
import { processTokens } from "@src/processor/process";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

/**
 * Typography validator - validates all fields within a typography token
 */
const typographyValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof TokenSymbol)) {
    return createIssue({
      code: "INVALID_TYPOGRAPHY_TYPE",
      severity: LintSeverity.ERROR,
      message: "Typography must be a structured token",
      tokenName: context.tokenName,
    });
  }

  const issues: LintIssue[] = [];
  const fields = value.value;

  // Validate fontSize
  const fontSize = fields.get("fontSize");
  if (fontSize instanceof NumberSymbol) {
    const size = fontSize.value;
    if (size === null || size <= 0) {
      issues.push(
        createIssue({
          code: "NEGATIVE_FONT_SIZE",
          severity: LintSeverity.ERROR,
          message: "Font size must be positive",
          tokenName: context.tokenName,
          path: ["fontSize"],
          data: { value: size },
        }),
      );
    } else if (size > 200) {
      issues.push(
        createIssue({
          code: "FONT_SIZE_TOO_LARGE",
          severity: LintSeverity.WARNING,
          message: "Font size is unusually large",
          tokenName: context.tokenName,
          path: ["fontSize"],
          data: { value: size },
        }),
      );
    }
  }

  // Validate lineHeight
  const lineHeight = fields.get("lineHeight");
  if (lineHeight instanceof NumberSymbol) {
    const height = lineHeight.value;
    if (height === null || height < 0) {
      issues.push(
        createIssue({
          code: "NEGATIVE_LINE_HEIGHT",
          severity: LintSeverity.ERROR,
          message: "Line height cannot be negative",
          tokenName: context.tokenName,
          path: ["lineHeight"],
          data: { value: height },
        }),
      );
    } else if (height > 0 && height < 0.5) {
      issues.push(
        createIssue({
          code: "LINE_HEIGHT_TOO_SMALL",
          severity: LintSeverity.WARNING,
          message: "Line height is too small for readability",
          tokenName: context.tokenName,
          path: ["lineHeight"],
          data: { value: height },
        }),
      );
    }
  }

  // Validate letterSpacing
  const letterSpacing = fields.get("letterSpacing");
  if (letterSpacing instanceof NumberSymbol) {
    const spacing = letterSpacing.value;
    if (spacing !== null && Math.abs(spacing) > 100) {
      issues.push(
        createIssue({
          code: "LETTER_SPACING_OUT_OF_RANGE",
          severity: LintSeverity.WARNING,
          message: "Letter spacing value is extreme",
          tokenName: context.tokenName,
          path: ["letterSpacing"],
          data: { value: spacing },
        }),
      );
    }
  }

  return issues;
};

/**
 * Shadow validator - validates all fields within a shadow token
 * Supports both single shadows and arrays of shadows
 */
const shadowValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof TokenSymbol)) {
    return createIssue({
      code: "INVALID_SHADOW_TYPE",
      severity: LintSeverity.ERROR,
      message: "Shadow must be a structured token",
      tokenName: context.tokenName,
    });
  }

  const issues: LintIssue[] = [];
  const fields = value.value;

  // Check if this is an array of shadows or a single shadow
  // For simplicity, we'll treat it as a single shadow for now
  // (arrays would be handled similarly with index in path)

  // Validate blur
  const blur = fields.get("blur");
  if (blur instanceof NumberSymbol) {
    const blurValue = blur.value;
    if (blurValue === null || blurValue < 0) {
      issues.push(
        createIssue({
          code: "NEGATIVE_BLUR",
          severity: LintSeverity.ERROR,
          message: "Blur cannot be negative",
          tokenName: context.tokenName,
          path: ["blur"],
          data: { value: blurValue },
        }),
      );
    } else if (blurValue > 100) {
      issues.push(
        createIssue({
          code: "BLUR_TOO_LARGE",
          severity: LintSeverity.WARNING,
          message: "Blur value is unusually large",
          tokenName: context.tokenName,
          path: ["blur"],
          data: { value: blurValue },
        }),
      );
    }
  }

  // Validate offsetX
  const offsetX = fields.get("offsetX");
  if (offsetX instanceof NumberSymbol) {
    const offset = offsetX.value;
    if (offset !== null && Math.abs(offset) > 500) {
      issues.push(
        createIssue({
          code: "OFFSET_OUT_OF_RANGE",
          severity: LintSeverity.WARNING,
          message: "Offset value is extremely large",
          tokenName: context.tokenName,
          path: ["offsetX"],
          data: { value: offset },
        }),
      );
    }
  }

  // Validate offsetY
  const offsetY = fields.get("offsetY");
  if (offsetY instanceof NumberSymbol) {
    const offset = offsetY.value;
    if (offset !== null && Math.abs(offset) > 500) {
      issues.push(
        createIssue({
          code: "OFFSET_OUT_OF_RANGE",
          severity: LintSeverity.WARNING,
          message: "Offset value is extremely large",
          tokenName: context.tokenName,
          path: ["offsetY"],
          data: { value: offset },
        }),
      );
    }
  }

  // Validate color
  const color = fields.get("color");
  if (color instanceof StringSymbol) {
    const colorValue = color.value;
    if (!colorValue || !colorValue.startsWith("#")) {
      issues.push(
        createIssue({
          code: "INVALID_COLOR_FORMAT",
          severity: LintSeverity.ERROR,
          message: "Color must be a hex value starting with #",
          tokenName: context.tokenName,
          path: ["color"],
          data: { value: colorValue },
        }),
      );
    }
  }

  return issues;
};

/**
 * Helper to create a linter with structured token validators
 */
function createStructuredTokenLinter(): LintRunner {
  return new LintRunner().addRule(new TypeBasedRule().forType("typography", typographyValidator).forType("shadow", shadowValidator));
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
              fontSize: "-16", // ❌ Negative font size
              lineHeight: "1.5", // ✓ Valid
              letterSpacing: "0.5", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      // Should have lint issue for the heading token
      expect(result.lint).toBeDefined();
      expect(result.lint?.has("heading")).toBe(true);

      const issues = result.lint?.get("heading");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].code).toBe("NEGATIVE_FONT_SIZE");
      expect(issues?.[0].path).toEqual(["fontSize"]);
      expect(issues?.[0].data).toEqual({ value: -16 });
    });

    it("should return multiple issues for multiple invalid fields", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // ❌ Negative
              lineHeight: "-1", // ❌ Negative
              letterSpacing: "500", // ❌ Out of range
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("heading");
      expect(issues).toHaveLength(3);

      // Check each issue has correct path
      const fontSizeIssue = issues?.find((i) => i.path?.[0] === "fontSize");
      expect(fontSizeIssue?.code).toBe("NEGATIVE_FONT_SIZE");
      expect(fontSizeIssue?.path).toEqual(["fontSize"]);

      const lineHeightIssue = issues?.find((i) => i.path?.[0] === "lineHeight");
      expect(lineHeightIssue?.code).toBe("NEGATIVE_LINE_HEIGHT");
      expect(lineHeightIssue?.path).toEqual(["lineHeight"]);

      const letterSpacingIssue = issues?.find((i) => i.path?.[0] === "letterSpacing");
      expect(letterSpacingIssue?.code).toBe("LETTER_SPACING_OUT_OF_RANGE");
      expect(letterSpacingIssue?.path).toEqual(["letterSpacing"]);
    });

    it("should handle mix of valid and invalid fields", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: {
              fontSize: "16", // ✓ Valid
              lineHeight: "-1", // ❌ Invalid
              letterSpacing: "1", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("text");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].path).toEqual(["lineHeight"]);
      expect(issues?.[0].code).toBe("NEGATIVE_LINE_HEIGHT");
    });

    it("should return warnings for edge cases", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "250", // ⚠️ Warning: too large
              lineHeight: "0.3", // ⚠️ Warning: too small
              letterSpacing: "0", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("heading");
      expect(issues).toHaveLength(2);

      const fontSizeIssue = issues?.find((i) => i.path?.[0] === "fontSize");
      expect(fontSizeIssue?.code).toBe("FONT_SIZE_TOO_LARGE");
      expect(fontSizeIssue?.severity).toBe(LintSeverity.WARNING);

      const lineHeightIssue = issues?.find((i) => i.path?.[0] === "lineHeight");
      expect(lineHeightIssue?.code).toBe("LINE_HEIGHT_TOO_SMALL");
      expect(lineHeightIssue?.severity).toBe(LintSeverity.WARNING);
    });
  });

  describe("shadow token validation", () => {
    it("should validate shadow fields with paths", () => {
      const tokens = new Map<string, TokenData>([
        [
          "card-shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0", // ✓ Valid
              offsetY: "4", // ✓ Valid
              blur: "-10", // ❌ Negative blur
              color: "#000000", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("card-shadow");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].code).toBe("NEGATIVE_BLUR");
      expect(issues?.[0].path).toEqual(["blur"]);
      expect(issues?.[0].data).toEqual({ value: -10 });
    });

    it("should validate color format", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "4",
              blur: "10",
              color: "red", // ❌ Invalid format (not hex)
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("shadow");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].code).toBe("INVALID_COLOR_FORMAT");
      expect(issues?.[0].path).toEqual(["color"]);
    });

    it("should warn on extreme offset values", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "1000", // ⚠️ Warning: extreme value
              offsetY: "-1000", // ⚠️ Warning: extreme value
              blur: "10",
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("shadow");
      expect(issues).toHaveLength(2);

      const offsetXIssue = issues?.find((i) => i.path?.[0] === "offsetX");
      expect(offsetXIssue?.code).toBe("OFFSET_OUT_OF_RANGE");

      const offsetYIssue = issues?.find((i) => i.path?.[0] === "offsetY");
      expect(offsetYIssue?.code).toBe("OFFSET_OUT_OF_RANGE");
    });

    it("should handle multiple issues in one shadow", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              blur: "-10", // ❌ Negative
              color: "red", // ❌ Invalid format
              offsetX: "1000", // ⚠️ Too large
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("shadow");
      expect(issues).toHaveLength(3);

      const paths = issues?.map((i) => i.path?.[0]);
      expect(paths).toContain("blur");
      expect(paths).toContain("color");
      expect(paths).toContain("offsetX");
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

      const issues = result.lint?.get("heading");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].code).toBe("NEGATIVE_FONT_SIZE");
      expect(issues?.[0].path).toEqual(["fontSize"]);
      expect(issues?.[0].data).toEqual({ value: -20 });
    });

    it("should validate computed values from expressions", () => {
      const tokens = new Map<string, TokenData>([
        ["base", { $value: "10", $type: "number" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              blur: "{base} * -2", // Resolves to -20 (invalid)
              offsetX: "{base} * 2", // Resolves to 20 (valid)
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("shadow");
      expect(issues).toHaveLength(1);
      expect(issues?.[0].code).toBe("NEGATIVE_BLUR");
      expect(issues?.[0].path).toEqual(["blur"]);
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
        expect(result.lintIssues).toBeDefined();
        expect(result.lintIssues?.has("heading")).toBe(true);

        const issues = result.lintIssues?.get("heading");
        expect(issues?.[0].path).toEqual(["fontSize"]);
        expect(issues?.[0].code).toBe("NEGATIVE_FONT_SIZE");
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
        expect(result.lintIssues).toBeUndefined();
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
        expect(result.lintIssues?.has("heading")).toBe(true);

        const issues = result.lintIssues?.get("heading");
        expect(issues?.[0].path).toEqual(["fontSize"]);
        expect(issues?.[0].code).toBe("NEGATIVE_FONT_SIZE");
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
        expect(result.lintIssues).toBeUndefined();
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
                letterSpacing: "0",
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
              letterSpacing: "200",
            },
          },
        });

        expect(result.updated).toBe(true);
        const issues = result.lintIssues?.get("heading");
        expect(issues).toHaveLength(2);

        const paths = issues?.map((i) => i.path?.[0]);
        expect(paths).toContain("fontSize");
        expect(paths).toContain("letterSpacing");
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
        expect(result.lintIssues?.has("body")).toBe(true);
        expect(result.lintIssues?.has("heading")).toBe(false);

        const bodyIssues = result.lintIssues?.get("body");
        expect(bodyIssues?.[0].path).toEqual(["fontSize"]);
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
              lineHeight: "0.3", // Warning
              letterSpacing: "0", // Valid
              fontWeight: "bold", // Valid (no validation)
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("heading");
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
      expect(fieldValidation.get("lineHeight")?.severity).toBe(LintSeverity.WARNING);

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

      expect(create.lintIssues).toBeUndefined();

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

      const issues1 = update1.lintIssues?.get("heading");
      expect(issues1?.find((i) => i.path?.[0] === "fontSize")).toBeDefined();

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

      const issues2 = update2.lintIssues?.get("heading");
      expect(issues2?.find((i) => i.path?.[0] === "fontSize")).toBeUndefined();
      expect(issues2?.find((i) => i.path?.[0] === "lineHeight")).toBeDefined();

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

      expect(update3.lintIssues).toBeUndefined();
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
              letterSpacing: "200",
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const allIssues = result.lint?.get("heading");

      // Get issues for specific field
      const fontSizeIssues = allIssues?.filter((i) => i.path?.[0] === "fontSize");
      const lineHeightIssues = allIssues?.filter((i) => i.path?.[0] === "lineHeight");
      const letterSpacingIssues = allIssues?.filter((i) => i.path?.[0] === "letterSpacing");

      expect(fontSizeIssues).toHaveLength(1);
      expect(lineHeightIssues).toHaveLength(1);
      expect(letterSpacingIssues).toHaveLength(1);
    });

    it("should count errors vs warnings by field", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // Error
              lineHeight: "0.3", // Warning
              letterSpacing: "200", // Warning
            },
          },
        ],
      ]);

      const linter = createStructuredTokenLinter();
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("heading");

      const errorCount = issues?.filter((i) => i.severity === LintSeverity.ERROR).length;
      const warningCount = issues?.filter((i) => i.severity === LintSeverity.WARNING).length;

      expect(errorCount).toBe(1);
      expect(warningCount).toBe(2);
    });
  });
});
