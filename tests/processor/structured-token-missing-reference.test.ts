import { ProcessorErrorCode } from "@src/interpreter/errors";
import { TokenResolver } from "@src/processor";
import { describe, expect, it } from "vitest";

describe("Structured Tokens - Missing Reference Handling", () => {
  it("should handle typography token with missing reference without circular dependency error", () => {
    const processor = new TokenResolver();

    const tokens = new Map([
      ["fontFamilies.body", { $value: ["Roboto"], $type: "fontFamilies" }],
      ["fontSizes.body", { $value: "16", $type: "fontSizes" }],
      // Note: fontWeights.bodyRegular is missing
      [
        "typography.Body",
        {
          $type: "typography",
          $value: {
            lineHeights: "1",
            fontSizes: "{fontSizes.body}",
            fontFamilies: "{fontFamilies.body}",
            fontWeights: "{fontWeights.bodyRegular}", // This reference doesn't exist
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    // The parent token should be in errors, not with circular dependency
    const parentError = result.issues?.get("typography.Body");
    expect(parentError).toBeDefined();

    // Should NOT be a circular dependency error
    const hasCircularDependency = parentError?.some((issue: any) => issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    expect(hasCircularDependency).toBe(false);

    // Should be marked as error due to missing reference in sub-field
    expect(result.resolved.get("typography.Body")).toBeInstanceOf(Error);

    // The sub-field with missing reference should have an error
    const fontWeightsError = result.resolved.get("typography.Body.fontWeights");
    expect(fontWeightsError).toBeInstanceOf(Error);

    // Other sub-fields should be resolved correctly
    expect(result.resolved.get("typography.Body.fontSizes")).toBeDefined();
    expect(result.resolved.get("typography.Body.fontSizes")).not.toBeInstanceOf(Error);
    expect(result.resolved.get("typography.Body.fontFamilies")).toBeDefined();
    expect(result.resolved.get("typography.Body.fontFamilies")).not.toBeInstanceOf(Error);
    expect(result.resolved.get("typography.Body.lineHeights")).toBeDefined();
    expect(result.resolved.get("typography.Body.lineHeights")).not.toBeInstanceOf(Error);
  });

  it("should call onResolve for typography token even when one field has an error", () => {
    const processor = new TokenResolver();
    const resolvedTokens: string[] = [];
    const errorTokens: string[] = [];

    const tokens = new Map([
      ["fontFamilies.body", { $value: ["Roboto"], $type: "fontFamilies" }],
      ["fontSizes.body", { $value: "16", $type: "fontSizes" }],
      ["fontWeights.regular", { $value: "400", $type: "fontWeights" }], // Add a valid reference
      [
        "typography.Body",
        {
          $type: "typography",
          $value: {
            lineHeights: "1",
            fontSizes: "{fontSizes.body}",
            fontFamilies: "{fontFamilies.body}",
            fontWeights: "{fontWeights.bodyRegular}", // This reference doesn't exist
          },
        },
      ],
    ]);

    const callbacks = {
      onResolve: (tokenName: string) => {
        resolvedTokens.push(tokenName);
      },
      onError: (tokenName: string) => {
        errorTokens.push(tokenName);
      },
    };

    processor.processTokens(tokens, callbacks);

    // The parent token should be in errors because a sub-field has an error
    expect(errorTokens).toContain("typography.Body");

    // But we should still have other tokens resolved
    expect(resolvedTokens).toContain("fontFamilies.body");
    expect(resolvedTokens).toContain("fontSizes.body");
    expect(resolvedTokens).toContain("fontWeights.regular");

    // The parent should NOT be marked as resolved since it has an error
    expect(resolvedTokens).not.toContain("typography.Body");
  });

  it("should provide partial resolution data for typography with one missing field", () => {
    const processor = new TokenResolver();

    const tokens = new Map([
      ["fontFamilies.body", { $value: ["Roboto"], $type: "fontFamilies" }],
      ["fontSizes.body", { $value: "16", $type: "fontSizes" }],
      [
        "typography.Body",
        {
          $type: "typography",
          $value: {
            lineHeights: "1.5",
            fontSizes: "{fontSizes.body}",
            fontFamilies: "{fontFamilies.body}",
            fontWeights: "{fontWeights.missing}", // Missing reference
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    // Check that we have partial resolution data
    const resolvedFields = new Map<string, any>();
    const errorFields = new Map<string, Error>();

    for (const [subFieldPath, fieldValue] of result.resolved) {
      if (subFieldPath.startsWith("typography.Body.")) {
        const fieldName = subFieldPath.substring("typography.Body.".length);

        if (fieldValue instanceof Error) {
          errorFields.set(fieldName, fieldValue);
        } else if (fieldValue) {
          resolvedFields.set(fieldName, fieldValue.value);
        }
      }
    }

    // Should have successfully resolved fields
    expect(resolvedFields.get("lineHeights")).toBe(1.5);
    expect(resolvedFields.get("fontSizes")).toBe(16);
    // fontFamilies returns an array with a StringSymbol
    const fontFamiliesValue = resolvedFields.get("fontFamilies");
    expect(fontFamiliesValue).toBeDefined();
    expect(Array.isArray(fontFamiliesValue)).toBe(true);
    expect(fontFamiliesValue[0]?.value).toBe("Roboto");

    // Should have error for the missing reference
    expect(errorFields.has("fontWeights")).toBe(true);

    // The parent token should be marked as error
    const parentToken = result.resolved.get("typography.Body");
    expect(parentToken).toBeInstanceOf(Error);
  });

  it("should handle real-world case from Penpot", () => {
    const processor = new TokenResolver();

    // Simulating the exact structure from the provided tokens.json
    const tokens = new Map([
      ["fontFamilies.heading", { $value: ["Inter"], $type: "fontFamilies" }],
      ["fontFamilies.body", { $value: ["Roboto"], $type: "fontFamilies" }],
      ["fontSizes.body", { $value: "16", $type: "fontSizes" }],
      // Note: fontWeights.bodyRegular is missing
      [
        "typography.Body",
        {
          $value: {
            lineHeights: "1",
            fontSizes: "{fontSizes.body}",
            fontFamilies: "{fontFamilies.body}",
            fontWeights: "{fontWeights.bodyRegular}", // Missing reference
          },
          $type: "typography",
        },
      ],
    ]);

    const resolvedTokens: string[] = [];
    const errorTokens: string[] = [];
    const result = {} as any;

    const callbacks = {
      onResolve: (tokenName: string, resolvedSymbol: any) => {
        resolvedTokens.push(tokenName);
        result[tokenName] = { resolvedValue: resolvedSymbol };
      },
      onError: (tokenName: string, error: Error) => {
        errorTokens.push(tokenName);
        result[tokenName] = { errors: [error] };
      },
    };

    const processorResult = processor.processTokens(tokens, callbacks);

    // Typography token should be in error list
    expect(errorTokens).toContain("typography.Body");

    // Should not be incorrectly marked as circular dependency
    const issues = processorResult.issues?.get("typography.Body");
    const hasCircular = issues?.some((issue: any) => issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    expect(hasCircular).toBe(false);

    // Should have error in result
    expect(result["typography.Body"]).toBeDefined();
    expect(result["typography.Body"].errors).toBeDefined();

    // Other tokens should resolve normally
    expect(resolvedTokens).toContain("fontFamilies.heading");
    expect(resolvedTokens).toContain("fontFamilies.body");
    expect(resolvedTokens).toContain("fontSizes.body");
  });
});
