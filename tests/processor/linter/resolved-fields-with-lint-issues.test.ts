import { NumberSymbol, TokenSymbol } from "@interpreter/symbols";
import { LintRunner, LintSeverity, TypeBasedRule } from "@src/processor/linter";
import type { TokenTypeValidator } from "@src/processor/linter/rules/TypeBasedRule";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

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
    expect(result.lint?.has("heading")).toBe(true);
    const lintIssues = result.lint?.get("heading");
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
    const lintIssues = result.lint?.get("text");
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
    const lintIssues = result.lint?.get("heading");

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

    // Lint issues should NOT exist for tokens with resolution errors
    // (linting runs on resolved values only)
    const lintIssues = result.lint?.get("test");
    expect(lintIssues).toBeUndefined();
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
    expect(updateResult.resolvedValue).toBeInstanceOf(TokenSymbol);

    // Has lint issues
    expect(updateResult.lintIssues?.has("heading")).toBe(true);

    // Can still access all field values
    if (updateResult.resolvedValue instanceof TokenSymbol) {
      const fields = updateResult.resolvedValue.value;

      const fontSize = fields.get("fontSize");
      expect((fontSize as NumberSymbol).value).toBe(-20);

      const lineHeight = fields.get("lineHeight");
      expect((lineHeight as NumberSymbol).value).toBe(1.5);
    }
  });
});
