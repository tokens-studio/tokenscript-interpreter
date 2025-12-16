import { TokenResolver } from "@src/processor";
import { describe, expect, it } from "vitest";

describe("Structured Tokens - Field-Level Error Information", () => {
  describe("accessing sub-field resolution results", () => {
    it("should provide sub-field resolution results in ProcessorResult.resolved", () => {
      const processor = new TokenResolver();

      const tokens = new Map([
        ["spacing.base", { $value: "8" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{spacing.base}",
              blur: "{missing}", // This will error
              color: "#FF0000",
            },
          },
        ],
      ]);

      const result = processor.processTokens(tokens);

      // Check individual sub-field resolutions in result.resolved
      const offsetX = result.resolved.get("shadow.offsetX");
      const offsetY = result.resolved.get("shadow.offsetY");
      const blur = result.resolved.get("shadow.blur");
      const color = result.resolved.get("shadow.color");

      // Successfully resolved sub-fields
      expect(offsetX).toBeDefined();
      expect(offsetX).not.toBeInstanceOf(Error);
      expect(offsetX?.value).toBe(0);

      expect(offsetY).toBeDefined();
      expect(offsetY).not.toBeInstanceOf(Error);
      expect(offsetY?.value).toBe(8);

      expect(color).toBeDefined();
      expect(color).not.toBeInstanceOf(Error);
      expect(color?.value).toBe("#FF0000");

      // Error sub-field
      expect(blur).toBeDefined();
      expect(blur).toBeInstanceOf(Error);
    });

    it("should allow building field-level error map for forms", () => {
      const processor = new TokenResolver();

      const tokens = new Map([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{missing1}",
              blur: "16",
              color: "{missing2}",
            },
          },
        ],
      ]);

      const result = processor.processTokens(tokens);

      // Build a field-level error map for form display
      const fieldErrors = new Map<string, Error>();

      // Check all possible sub-field paths in result.resolved
      for (const [refPath, fieldValue] of result.resolved) {
        // Check if this sub-field belongs to our token
        if (refPath.startsWith("shadow.")) {
          if (fieldValue instanceof Error) {
            // Extract just the field name (e.g., "offsetY" from "shadow.offsetY")
            const fieldName = refPath.substring("shadow.".length);
            fieldErrors.set(fieldName, fieldValue);
          }
        }
      }

      // Now we have field-level errors for the form
      expect(fieldErrors.has("offsetY")).toBe(true);
      expect(fieldErrors.has("color")).toBe(true);
      expect(fieldErrors.has("offsetX")).toBe(false); // No error
      expect(fieldErrors.has("blur")).toBe(false); // No error

      // You can use this to show errors on specific form fields
      const offsetYError = fieldErrors.get("offsetY");
      expect(offsetYError).toBeInstanceOf(Error);
      expect(offsetYError?.message).toContain("missing1");
    });

    it("should provide partial resolution for structured tokens with some errors", () => {
      const processor = new TokenResolver();

      const tokens = new Map([
        ["base", { $value: "8" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{base}", // ✓ Resolves successfully
              blur: "{missing}", // ✗ Error
              color: "#FF0000", // ✓ Resolves successfully
            },
          },
        ],
      ]);

      const result = processor.processTokens(tokens);

      // Build a map of successfully resolved fields and errors
      const resolvedFields = new Map<string, any>();
      const errorFields = new Map<string, Error>();

      for (const [subFieldPath, fieldValue] of result.resolved) {
        if (subFieldPath.startsWith("shadow.")) {
          const fieldName = subFieldPath.substring("shadow.".length);

          if (fieldValue instanceof Error) {
            errorFields.set(fieldName, fieldValue);
          } else if (fieldValue) {
            resolvedFields.set(fieldName, fieldValue.value);
          }
        }
      }

      // Successfully resolved fields
      expect(resolvedFields.get("offsetX")).toBe(0);
      expect(resolvedFields.get("offsetY")).toBe(8);
      expect(resolvedFields.get("color")).toBe("#FF0000");

      // Error fields
      expect(errorFields.has("blur")).toBe(true);

      // You can show a partial preview in the form with errors highlighted
      expect(resolvedFields.size).toBe(3); // 3 successful fields
      expect(errorFields.size).toBe(1); // 1 error field
    });

    it("should handle nested field paths correctly", () => {
      const processor = new TokenResolver();

      const tokens = new Map([
        [
          "typography",
          {
            $type: "typography",
            $value: {
              "font-family": "Arial",
              "font-size": "{base.size}",
              "font-weight": "Bold",
              "line-height": "{missing}",
            },
          },
        ],
        ["base.size", { $value: "16" }],
      ]);

      const result = processor.processTokens(tokens);

      // Helper function to extract field name from sub-field path
      const getFieldName = (subFieldPath: string, parentPath: string) => {
        return subFieldPath.substring(parentPath.length + 1);
      };

      const fieldResults = new Map<string, { value?: any; error?: Error }>();

      for (const [subFieldPath, fieldValue] of result.resolved) {
        if (subFieldPath.startsWith("typography.")) {
          const fieldName = getFieldName(subFieldPath, "typography");

          if (fieldValue instanceof Error) {
            fieldResults.set(fieldName, { error: fieldValue });
          } else if (fieldValue) {
            fieldResults.set(fieldName, { value: fieldValue.value });
          }
        }
      }

      // Check field results
      expect(fieldResults.get("font-family")?.value).toBe("Arial");
      expect(fieldResults.get("font-size")?.value).toBe(16);
      expect(fieldResults.get("font-weight")?.value).toBe("Bold");
      expect(fieldResults.get("line-height")?.error).toBeInstanceOf(Error);
    });
  });

  describe("form use case examples", () => {
    it("should support real-time field validation in forms", () => {
      const processor = new TokenResolver();

      // Simulate a form where user is editing a shadow token
      const tokens = new Map([
        ["spacing.sm", { $value: "4" }],
        ["spacing.md", { $value: "8" }],
        ["color.primary", { $value: "#FF0000" }],
        [
          "shadow.card",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{spacing.md}",
              blur: "{spacing.sm} * 2",
              color: "{color.primary}",
            },
          },
        ],
      ]);

      const result = processor.processTokens(tokens);

      // Helper to get field status for form rendering
      function getFieldStatus(tokenName: string, fieldName: string) {
        const subFieldPath = `${tokenName}.${fieldName}`;
        const fieldValue = result.resolved.get(subFieldPath);

        if (!fieldValue) {
          return { status: "pending" };
        }

        if (fieldValue instanceof Error) {
          return {
            status: "error",
            error: fieldValue.message,
            value: null,
          };
        }

        return {
          status: "success",
          value: fieldValue.value,
          error: null,
        };
      }

      // Check each field's status for the form
      const offsetXStatus = getFieldStatus("shadow.card", "offsetX");
      const offsetYStatus = getFieldStatus("shadow.card", "offsetY");
      const blurStatus = getFieldStatus("shadow.card", "blur");
      const colorStatus = getFieldStatus("shadow.card", "color");

      expect(offsetXStatus.status).toBe("success");
      expect(offsetXStatus.value).toBe(0);

      expect(offsetYStatus.status).toBe("success");
      expect(offsetYStatus.value).toBe(8);

      expect(blurStatus.status).toBe("success");
      expect(blurStatus.value).toBe(8);

      expect(colorStatus.status).toBe("success");
      expect(colorStatus.value).toBe("#FF0000");

      // All fields are valid - form can show preview
    });

    it("should highlight error fields while showing valid fields", () => {
      const processor = new TokenResolver();

      const tokens = new Map([
        ["base", { $value: "8" }],
        [
          "shadow.card",
          {
            $type: "shadow",
            $value: {
              offsetX: "0", // ✓ Valid
              offsetY: "{base}", // ✓ Valid (resolved)
              blur: "{invalid.ref}", // ✗ Invalid reference
              color: "#FF0000", // ✓ Valid
              spread: "{another.bad}", // ✗ Invalid reference
            },
          },
        ],
      ]);

      const result = processor.processTokens(tokens);

      // Get validation state for all fields
      const fieldValidation = new Map<string, { valid: boolean; value?: any; error?: string }>();

      for (const [subFieldPath, fieldValue] of result.resolved) {
        if (subFieldPath.startsWith("shadow.card.")) {
          const fieldName = subFieldPath.substring("shadow.card.".length);

          if (fieldValue instanceof Error) {
            fieldValidation.set(fieldName, {
              valid: false,
              error: fieldValue.message,
            });
          } else if (fieldValue) {
            fieldValidation.set(fieldName, {
              valid: true,
              value: fieldValue.value,
            });
          }
        }
      }

      // Form can render with field-level validation
      expect(fieldValidation.get("offsetX")?.valid).toBe(true);
      expect(fieldValidation.get("offsetY")?.valid).toBe(true);
      expect(fieldValidation.get("blur")?.valid).toBe(false);
      expect(fieldValidation.get("color")?.valid).toBe(true);
      expect(fieldValidation.get("spread")?.valid).toBe(false);

      // Count valid vs invalid
      const validCount = Array.from(fieldValidation.values()).filter((v) => v.valid).length;
      const errorCount = Array.from(fieldValidation.values()).filter((v) => !v.valid).length;

      expect(validCount).toBe(3);
      expect(errorCount).toBe(2);
    });
  });
});
