import { ColorSymbol, NumberSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { LintRunner, LintSeverity, TypeBasedRule } from "@src/processor/linter";
import type { TokenTypeValidator } from "@src/processor/linter/rules/TypeBasedRule";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

/**
 * Tests to verify that TokenSymbol subfields remain accessible even when
 * there are lint issues (errors or warnings) on other fields.
 *
 * This is critical for UI/form scenarios where users need to:
 * - View all field values even if some are invalid
 * - Edit fields individually
 * - See which specific fields have issues
 * - Preview tokens with warnings (but not errors)
 */

/**
 * Typography validator that validates fontSize
 */
const typographyValidator: TokenTypeValidator = (value, context, createIssue) => {
  if (!(value instanceof TokenSymbol)) return null;

  const issues = [];
  const fields = value.value;

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
    }
  }

  return issues;
};

function createLinter(): LintRunner {
  return new LintRunner().addRule(new TypeBasedRule().forType("typography", typographyValidator));
}

describe("Resolved Fields with Lint Issues", () => {
  it("should resolve all fields even when some have lint issues", () => {
    const tokens = new Map<string, TokenData>([
      [
        "heading",
        {
          $type: "typography",
          $value: {
            fontSize: "-16", // ❌ Invalid (lint issue)
            lineHeight: "1.5", // ✓ Valid
            letterSpacing: "2", // ✓ Valid
          },
        },
      ],
    ]);

    const linter = createLinter();
    const result = processTokens(tokens, { linter });

    // Token should be resolved (not an error)
    expect(result.errors.has("heading")).toBe(false);
    expect(result.resolved.has("heading")).toBe(true);

    // Token should have lint issues
    expect(result.issues?.has("heading")).toBe(true);
    const lintIssues = result.issues?.get("heading");
    expect(lintIssues).toHaveLength(1);
    expect(lintIssues?.[0].code).toBe("NEGATIVE_FONT_SIZE");
    expect(lintIssues?.[0].path).toEqual(["fontSize"]);

    // All fields should be accessible
    const resolvedToken = result.resolved.get("heading");
    expect(resolvedToken).toBeInstanceOf(TokenSymbol);

    if (resolvedToken instanceof TokenSymbol) {
      const fields = resolvedToken.value;

      // fontSize field (invalid but still resolved)
      const fontSize = fields.get("fontSize");
      expect(fontSize).toBeInstanceOf(NumberSymbol);
      expect((fontSize as NumberSymbol).value).toBe(-16);

      // lineHeight field (valid)
      const lineHeight = fields.get("lineHeight");
      expect(lineHeight).toBeInstanceOf(NumberSymbol);
      expect((lineHeight as NumberSymbol).value).toBe(1.5);

      // letterSpacing field (valid)
      const letterSpacing = fields.get("letterSpacing");
      expect(letterSpacing).toBeInstanceOf(NumberSymbol);
      expect((letterSpacing as NumberSymbol).value).toBe(2);
    }
  });

  it("should provide access to all fields in UI even with multiple lint issues", () => {
    const tokens = new Map<string, TokenData>([
      [
        "text",
        {
          $type: "typography",
          $value: {
            fontSize: "-16", // ❌ Lint issue
            lineHeight: "1.5", // ✓ Valid
            letterSpacing: "2", // ✓ Valid
            fontWeight: "bold", // ✓ Valid (no validation)
          },
        },
      ],
    ]);

    const linter = createLinter();
    const result = processTokens(tokens, { linter });

    // Token is resolved
    const resolvedToken = result.resolved.get("text");
    expect(resolvedToken).toBeInstanceOf(TokenSymbol);

    // Has lint issues
    const lintIssues = result.issues?.get("text");
    expect(lintIssues).toBeDefined();

    // Simulate UI building field state
    if (resolvedToken instanceof TokenSymbol) {
      const fields = resolvedToken.value;
      const fieldNames = ["fontSize", "lineHeight", "letterSpacing", "fontWeight"];

      // Build field state for UI
      const fieldState = new Map<
        string,
        {
          value: any;
          hasIssue: boolean;
          issue?: string;
        }
      >();

      for (const fieldName of fieldNames) {
        const fieldValue = fields.get(fieldName);
        const fieldIssue = lintIssues?.find((issue) => issue.path?.[0] === fieldName);

        fieldState.set(fieldName, {
          value: fieldValue instanceof NumberSymbol ? fieldValue.value : fieldValue?.toString(),
          hasIssue: !!fieldIssue,
          issue: fieldIssue?.message,
        });
      }

      // Verify UI can access all fields
      expect(fieldState.size).toBe(4);

      // fontSize - has issue but value is still accessible
      expect(fieldState.get("fontSize")?.value).toBe(-16);
      expect(fieldState.get("fontSize")?.hasIssue).toBe(true);
      expect(fieldState.get("fontSize")?.issue).toBe("Font size must be positive");

      // Other fields - no issues, values accessible
      expect(fieldState.get("lineHeight")?.value).toBe(1.5);
      expect(fieldState.get("lineHeight")?.hasIssue).toBe(false);

      expect(fieldState.get("letterSpacing")?.value).toBe(2);
      expect(fieldState.get("letterSpacing")?.hasIssue).toBe(false);

      expect(fieldState.get("fontWeight")?.value).toBe("bold");
      expect(fieldState.get("fontWeight")?.hasIssue).toBe(false);
    }
  });

  it("should allow using resolved values even when field has lint issue", () => {
    const tokens = new Map<string, TokenData>([
      [
        "heading",
        {
          $type: "typography",
          $value: {
            fontSize: "-16", // Invalid but resolved
            lineHeight: "1.5",
          },
        },
      ],
    ]);

    const linter = createLinter();
    const result = processTokens(tokens, { linter });

    const resolvedToken = result.resolved.get("heading");
    const lintIssues = result.issues?.get("heading");

    // Can use the resolved value for preview/calculations
    if (resolvedToken instanceof TokenSymbol) {
      const fontSize = resolvedToken.value.get("fontSize");

      // Value is accessible for use (e.g., in preview)
      expect(fontSize).toBeInstanceOf(NumberSymbol);
      expect((fontSize as NumberSymbol).value).toBe(-16);

      // But we know it has a validation issue
      const fontSizeIssue = lintIssues?.find((i) => i.path?.[0] === "fontSize");
      expect(fontSizeIssue).toBeDefined();

      // UI can show preview with warning overlay
      const canPreview = fontSize !== undefined;
      const shouldShowWarning = fontSizeIssue !== undefined;

      expect(canPreview).toBe(true);
      expect(shouldShowWarning).toBe(true);
    }
  });

  it("should distinguish between resolution errors and lint issues", () => {
    const tokens = new Map<string, TokenData>([
      [
        "test",
        {
          $type: "typography",
          $value: {
            fontSize: "{missing}", // ❌ Resolution error (reference not found)
            lineHeight: "-1", // Would be lint issue, but won't be linted if resolution fails
          },
        },
      ],
    ]);

    const linter = createLinter();
    const result = processTokens(tokens, { linter });

    // Token should have resolution error
    expect(result.errors.has("test") || result.errors.has("test.fontSize")).toBe(true);

    // Issues may contain Error objects, but NOT LintIssues
    // (linting runs on resolved values only)
    const issues = result.issues?.get("test");
    if (issues) {
      // All issues should be Error objects, not LintIssues
      expect(issues.every((issue) => issue instanceof Error)).toBe(true);
    }
  });

  it("should work with CRUD operations - resolved fields accessible with lint issues", () => {
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

    const linter = createLinter();
    const { resolver } = processTokens(tokens, { linter });

    // Update to introduce lint issue
    const updateResult = resolver.updateToken({
      tokenPath: "heading",
      tokenData: {
        $type: "typography",
        $value: {
          fontSize: "-20", // Now invalid
          lineHeight: "1.5",
        },
      },
    });

    // Token is updated and resolved
    expect(updateResult.updated).toBe(true);
    expect(updateResult.resolved).toBeInstanceOf(TokenSymbol);

    // Has lint issues
    expect(updateResult.issues?.has("heading")).toBe(true);

    // Can still access all field values
    if (updateResult.resolved instanceof TokenSymbol) {
      const fields = updateResult.resolved.value;

      const fontSize = fields.get("fontSize");
      expect((fontSize as NumberSymbol).value).toBe(-20);

      const lineHeight = fields.get("lineHeight");
      expect((lineHeight as NumberSymbol).value).toBe(1.5);
    }
  });

  describe("TokenSymbol field accessibility with warnings", () => {
    const multiFieldValidator: TokenTypeValidator = (value, context, createIssue) => {
      if (!(value instanceof TokenSymbol)) return null;
      if (!(value.value instanceof Map)) return null;

      const issues = [];

      // Validate fontSize - ERROR for negative
      const fontSize = value.get("fontSize");
      if (fontSize instanceof NumberSymbol && fontSize.value !== null) {
        if (fontSize.value <= 0) {
          issues.push(
            createIssue({
              code: "NEGATIVE_FONT_SIZE",
              severity: LintSeverity.ERROR,
              message: "Font size must be positive",
              tokenName: context.tokenName,
              path: ["fontSize"],
              data: { value: fontSize.value },
            }),
          );
        } else if (fontSize.value > 200) {
          issues.push(
            createIssue({
              code: "FONT_SIZE_TOO_LARGE",
              severity: LintSeverity.WARNING,
              message: "Font size is unusually large",
              tokenName: context.tokenName,
              path: ["fontSize"],
              data: { value: fontSize.value },
            }),
          );
        }
      }

      // Validate lineHeight - WARNING for small values
      const lineHeight = value.get("lineHeight");
      if (lineHeight instanceof NumberSymbol && lineHeight.value !== null) {
        if (lineHeight.value < 0.5) {
          issues.push(
            createIssue({
              code: "LINE_HEIGHT_TOO_SMALL",
              severity: LintSeverity.WARNING,
              message: "Line height is too small",
              tokenName: context.tokenName,
              path: ["lineHeight"],
              data: { value: lineHeight.value },
            }),
          );
        }
      }

      return issues;
    };

    it("should access all fields via TokenSymbol.get() when some have warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "250", // ⚠️ Warning: too large
              lineHeight: "0.3", // ⚠️ Warning: too small
              letterSpacing: "0.5", // ✓ Valid
              fontWeight: "bold", // ✓ Valid (no validation)
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("typography", multiFieldValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("heading");
      expect(token).toBeInstanceOf(TokenSymbol);

      // Should have warnings but token is resolved
      const issues = result.issues?.get("heading");
      expect(issues).toBeDefined();
      expect(issues?.filter((i) => i.severity === LintSeverity.WARNING).length).toBe(2);

      // All fields should be accessible via .get()
      if (token instanceof TokenSymbol) {
        const fontSize = token.get("fontSize");
        expect(fontSize).toBeInstanceOf(NumberSymbol);
        expect((fontSize as NumberSymbol).value).toBe(250);

        const lineHeight = token.get("lineHeight");
        expect(lineHeight).toBeInstanceOf(NumberSymbol);
        expect((lineHeight as NumberSymbol).value).toBe(0.3);

        const letterSpacing = token.get("letterSpacing");
        expect(letterSpacing).toBeInstanceOf(NumberSymbol);
        expect((letterSpacing as NumberSymbol).value).toBe(0.5);

        const fontWeight = token.get("fontWeight");
        expect(fontWeight).toBeInstanceOf(StringSymbol);
        expect((fontWeight as StringSymbol).value).toBe("bold");
      }
    });

    it("should use TokenSymbol.keys() and .values() when fields have warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: {
              fontSize: "300", // ⚠️ Warning
              lineHeight: "1.5", // ✓ Valid
              letterSpacing: "0", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("typography", multiFieldValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("text") as TokenSymbol;
      expect(token).toBeInstanceOf(TokenSymbol);

      // Use .keys() method
      const keys = token.keys();
      expect(keys.value.length).toBe(3);
      const keyStrings = keys.value.map((k) => (k as StringSymbol).value);
      expect(keyStrings).toContain("fontSize");
      expect(keyStrings).toContain("lineHeight");
      expect(keyStrings).toContain("letterSpacing");

      // Use .values() method
      const values = token.values();
      expect(values.value.length).toBe(3);

      // All values should be accessible
      expect(values.value[0]).toBeInstanceOf(NumberSymbol);
      expect(values.value[1]).toBeInstanceOf(NumberSymbol);
      expect(values.value[2]).toBeInstanceOf(NumberSymbol);
    });

    it("should use TokenSymbol.length() when fields have warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "heading",
          {
            $type: "typography",
            $value: {
              fontSize: "250", // ⚠️ Warning
              lineHeight: "0.3", // ⚠️ Warning
              letterSpacing: "0.5", // ✓ Valid
              fontWeight: "bold", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("typography", multiFieldValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("heading") as TokenSymbol;

      // .length() should return correct count even with warnings
      const fieldCount = token.length();
      expect(fieldCount).toBeInstanceOf(NumberSymbol);
      expect((fieldCount as NumberSymbol).value).toBe(4);
    });

    it("should access fields by iterating when some have errors", () => {
      const tokens = new Map<string, TokenData>([
        [
          "mixed",
          {
            $type: "typography",
            $value: {
              fontSize: "-16", // ❌ Error
              lineHeight: "0.2", // ⚠️ Warning
              letterSpacing: "1", // ✓ Valid
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("typography", multiFieldValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("mixed") as TokenSymbol;
      const issues = result.issues?.get("mixed");

      // Should have 1 error and 1 warning
      expect(issues?.filter((i) => i.severity === LintSeverity.ERROR).length).toBe(1);
      expect(issues?.filter((i) => i.severity === LintSeverity.WARNING).length).toBe(1);

      // Iterate and access all fields
      const keys = token.keys();
      const fieldMap = new Map<string, any>();

      for (let i = 0; i < keys.value.length; i++) {
        const key = (keys.value[i] as StringSymbol).value as string;
        const value = token.get(key);
        fieldMap.set(key, value);
      }

      expect(fieldMap.size).toBe(3);
      expect(fieldMap.get("fontSize")).toBeInstanceOf(NumberSymbol);
      expect(fieldMap.get("lineHeight")).toBeInstanceOf(NumberSymbol);
      expect(fieldMap.get("letterSpacing")).toBeInstanceOf(NumberSymbol);
    });
  });

  describe("Array-based TokenSymbol field accessibility with warnings", () => {
    const shadowValidator: TokenTypeValidator = (value, context, createIssue) => {
      if (!(value instanceof TokenSymbol)) return null;
      if (!Array.isArray(value.value)) return null;

      const issues = [];
      const shadows = value.value;

      shadows.forEach((shadow, index) => {
        if (!shadow.get) return;

        const shadowItem = value.get(index);

        // Validate blur - ERROR for negative
        const blur = shadowItem.get("blur");
        if (blur instanceof NumberSymbol && blur.value !== null) {
          if (blur.value < 0) {
            issues.push(
              createIssue({
                code: "NEGATIVE_BLUR",
                severity: LintSeverity.ERROR,
                message: "Blur cannot be negative",
                tokenName: context.tokenName,
                path: [index, "blur"],
                data: { index, value: blur.value },
              }),
            );
          } else if (blur.value > 100) {
            issues.push(
              createIssue({
                code: "BLUR_TOO_LARGE",
                severity: LintSeverity.WARNING,
                message: "Blur value is unusually large",
                tokenName: context.tokenName,
                path: [index, "blur"],
                data: { index, value: blur.value },
              }),
            );
          }
        }

        // Validate color - can be ColorSymbol or StringSymbol
        const color = shadowItem.get("color");
        if (color instanceof ColorSymbol && color.value) {
          // ColorSymbol already validated, skip
        } else if (color instanceof StringSymbol && color.value) {
          if (!color.value.startsWith("#")) {
            issues.push(
              createIssue({
                code: "INVALID_COLOR",
                severity: LintSeverity.ERROR,
                message: "Color must start with #",
                tokenName: context.tokenName,
                path: [index, "color"],
                data: { index, value: color.value },
              }),
            );
          }
        }
      });

      return issues;
    };

    it("should access all array items when some have warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadows",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0",
                offsetY: "2",
                blur: "150", // ⚠️ Warning: too large
                color: "#000000",
              },
              {
                offsetX: "0",
                offsetY: "4",
                blur: "8", // ✓ Valid
                color: "#333333",
              },
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("shadow", shadowValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("shadows") as TokenSymbol;
      expect(token).toBeInstanceOf(TokenSymbol);
      expect(Array.isArray(token.value)).toBe(true);

      // Should have warning on first shadow
      const issues = result.issues?.get("shadows");
      expect(issues?.find((i) => i.path?.[0] === 0)).toBeDefined();

      // All array items should be accessible
      expect(token.value.length).toBe(2);

      // Access first shadow (has warning)
      const shadow0 = token.get(0);
      expect(shadow0).toBeDefined();
      expect(shadow0.get).toBeDefined();

      const blur0 = shadow0.get("blur");
      expect(blur0).toBeInstanceOf(NumberSymbol);
      expect((blur0 as NumberSymbol).value).toBe(150);

      const color0 = shadow0.get("color");
      expect(color0).toBeInstanceOf(ColorSymbol);
      expect((color0 as ColorSymbol).value).toBe("#000000");

      // Access second shadow (valid)
      const shadow1 = token.get(1);
      const blur1 = shadow1.get("blur");
      expect((blur1 as NumberSymbol).value).toBe(8);
    });

    it("should use TokenSymbol.length() for arrays when items have warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadows",
          {
            $type: "shadow",
            $value: [
              { offsetX: "0", offsetY: "0", blur: "200", color: "#000" }, // ⚠️ Warning
              { offsetX: "0", offsetY: "0", blur: "10", color: "#000" }, // ✓ Valid
              { offsetX: "0", offsetY: "0", blur: "150", color: "#000" }, // ⚠️ Warning
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("shadow", shadowValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("shadows") as TokenSymbol;

      // .length() should return correct count
      const length = token.length();
      expect(length).toBeInstanceOf(NumberSymbol);
      expect((length as NumberSymbol).value).toBe(3);

      // All items accessible
      for (let i = 0; i < 3; i++) {
        const shadow = token.get(i);
        expect(shadow).toBeDefined();
        expect(shadow.get).toBeDefined();
      }
    });

    it("should iterate array items when some have errors and warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadows",
          {
            $type: "shadow",
            $value: [
              { offsetX: "0", offsetY: "0", blur: "-10", color: "#000" }, // ❌ Error
              { offsetX: "0", offsetY: "0", blur: "150", color: "red" }, // ⚠️ + ❌
              { offsetX: "0", offsetY: "0", blur: "10", color: "#000" }, // ✓ Valid
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("shadow", shadowValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("shadows") as TokenSymbol;
      const issues = result.issues?.get("shadows");

      // Should have multiple issues
      expect(issues && issues.length > 0).toBe(true);

      // All array items should still be accessible
      const allShadows = [];
      for (let i = 0; i < token.value.length; i++) {
        const shadow = token.get(i);
        const blur = shadow.get("blur");
        const color = shadow.get("color");

        allShadows.push({
          index: i,
          blur: blur instanceof NumberSymbol ? blur.value : null,
          color: color instanceof ColorSymbol ? color.value : color instanceof StringSymbol ? color.value : null,
          hasIssue: issues?.some((issue) => issue.path?.[0] === i),
        });
      }

      expect(allShadows.length).toBe(3);
      expect(allShadows[0].hasIssue).toBe(true); // Error
      expect(allShadows[1].hasIssue).toBe(true); // Warning + Error
      expect(allShadows[2].hasIssue).toBe(false); // Valid

      // All values should be accessible regardless of validation
      expect(allShadows[0].blur).toBe(-10);
      expect(allShadows[1].blur).toBe(150);
      expect(allShadows[2].blur).toBe(10);
    });

    it("should access nested fields in array items when parent has warnings", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadows",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0",
                offsetY: "0",
                blur: "200", // ⚠️ Warning on this field
                spread: "5", // ✓ Valid (no validation)
                color: "#000000", // ✓ Valid
              },
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("shadow", shadowValidator));
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("shadows") as TokenSymbol;
      const shadow = token.get(0);

      // All nested fields accessible, even when one has warning
      const blur = shadow.get("blur");
      expect((blur as NumberSymbol).value).toBe(200);

      const spread = shadow.get("spread");
      expect((spread as NumberSymbol).value).toBe(5);

      const color = shadow.get("color");
      expect((color as ColorSymbol).value).toBe("#000000");

      const offsetX = shadow.get("offsetX");
      expect((offsetX as NumberSymbol).value).toBe(0);
    });
  });
});
