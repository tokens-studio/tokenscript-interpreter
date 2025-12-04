import { TokenResolver } from "@src/processor";
import { describe, expect, it } from "vitest";

describe("TokenResolver - Callbacks with Structured Tokens", () => {
  describe("onResolve callback", () => {
    it("should only call onResolve for parent token, not sub-fields", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];

      const tokens = new Map([
        [
          "typography",
          {
            $type: "typography",
            $value: {
              "font-family": ["Arial", "sans-serif"],
              "font-size": "12",
              "font-weight": "Bold",
              "letter-spacing": "10",
              "line-height": "1.2",
              "text-case": "uppercase",
              "text-decoration": "underline",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should only have the parent token, not the sub-fields
      expect(resolvedTokens).toEqual(["typography"]);
    });

    it("should call onResolve for structured token with references", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];

      const tokens = new Map([
        ["spacing.base", { $value: "8" }],
        ["color.primary", { $value: "#FF0000" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{spacing.base}",
              color: "{color.primary}",
              blur: "16",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have all top-level tokens, but not sub-fields
      expect(resolvedTokens).toContain("spacing.base");
      expect(resolvedTokens).toContain("color.primary");
      expect(resolvedTokens).toContain("shadow");

      // Should not have sub-fields
      expect(resolvedTokens).not.toContain("shadow.offsetX");
      expect(resolvedTokens).not.toContain("shadow.offsetY");
      expect(resolvedTokens).not.toContain("shadow.color");
      expect(resolvedTokens).not.toContain("shadow.blur");

      // Should have exactly 3 tokens
      expect(resolvedTokens).toHaveLength(3);
    });

    it("should call onResolve for multiple structured tokens", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];

      const tokens = new Map([
        ["spacing.small", { $value: "4" }],
        ["color.red", { $value: "#FF0000" }],
        [
          "shadow.small",
          {
            $type: "shadow",
            $value: {
              offsetY: "{spacing.small}",
              color: "{color.red}",
            },
          },
        ],
        [
          "shadow.large",
          {
            $type: "shadow",
            $value: {
              offsetY: "16",
              color: "#0000FF",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have all parent tokens
      expect(resolvedTokens).toContain("spacing.small");
      expect(resolvedTokens).toContain("color.red");
      expect(resolvedTokens).toContain("shadow.small");
      expect(resolvedTokens).toContain("shadow.large");

      // Should not have any sub-fields
      expect(resolvedTokens).not.toContain("shadow.small.offsetY");
      expect(resolvedTokens).not.toContain("shadow.small.color");
      expect(resolvedTokens).not.toContain("shadow.large.offsetY");
      expect(resolvedTokens).not.toContain("shadow.large.color");

      // Should have exactly 4 tokens
      expect(resolvedTokens).toHaveLength(4);
    });

    it("should call onResolve for structured token with only primitive values", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];

      const tokens = new Map([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "2",
              offsetY: "4",
              blur: "8",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should only have the parent token
      expect(resolvedTokens).toEqual(["shadow"]);
      expect(resolvedTokens).not.toContain("shadow.offsetX");
      expect(resolvedTokens).not.toContain("shadow.offsetY");
      expect(resolvedTokens).not.toContain("shadow.blur");
    });

    it("should call onResolve for structured token with mixed primitive types", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];

      const tokens = new Map([
        [
          "config",
          {
            $type: "config",
            $value: {
              enabled: true,
              count: 42,
              ratio: 1.5,
              name: "test",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should only have the parent token
      expect(resolvedTokens).toEqual(["config"]);
      expect(resolvedTokens).not.toContain("config.enabled");
      expect(resolvedTokens).not.toContain("config.count");
      expect(resolvedTokens).not.toContain("config.ratio");
      expect(resolvedTokens).not.toContain("config.name");
    });
  });

  describe("onError callback", () => {
    it("should call onError for both parent and sub-field errors with metadata", () => {
      const processor = new TokenResolver();
      const errorTokens: string[] = [];
      const subFieldErrors = new Map<string, { parent: string; field: string }>();

      const tokens = new Map([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{nonexistent}",
              blur: "16",
            },
          },
        ],
      ]);

      const callbacks = {
        onError: (tokenName: string, _error: Error, _originalValue: string, metadata?: any) => {
          errorTokens.push(tokenName);
          if (metadata?.isSubField) {
            subFieldErrors.set(tokenName, {
              parent: metadata.parentToken,
              field: metadata.fieldPath,
            });
          }
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have the parent token error
      expect(errorTokens).toContain("shadow");

      // Should also have sub-field error with metadata
      expect(errorTokens).toContain("shadow.offsetY");
      expect(subFieldErrors.has("shadow.offsetY")).toBe(true);
      expect(subFieldErrors.get("shadow.offsetY")?.parent).toBe("shadow");
      expect(subFieldErrors.get("shadow.offsetY")?.field).toBe("offsetY");

      // Should also include the nonexistent token
      expect(errorTokens).toContain("nonexistent");
    });

    it("should call onError for parent and all sub-fields with errors", () => {
      const processor = new TokenResolver();
      const errorTokens: string[] = [];
      const fieldErrors = new Map<string, string>();

      const tokens = new Map([
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetY: "{missing1}",
              color: "{missing2}",
            },
          },
        ],
      ]);

      const callbacks = {
        onError: (tokenName: string, error: Error, _originalValue: string, metadata?: any) => {
          errorTokens.push(tokenName);
          if (metadata?.isSubField) {
            fieldErrors.set(metadata.fieldPath, error.message);
          }
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have the parent token error
      expect(errorTokens).toContain("shadow");

      // Should have sub-field errors with metadata
      expect(errorTokens).toContain("shadow.offsetY");
      expect(errorTokens).toContain("shadow.color");

      // Field errors map should have both fields
      expect(fieldErrors.has("offsetY")).toBe(true);
      expect(fieldErrors.has("color")).toBe(true);

      // Should have the missing tokens
      expect(errorTokens).toContain("missing1");
      expect(errorTokens).toContain("missing2");
    });

    it("should not call callbacks for successfully resolved sub-fields", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];
      const errorTokens: string[] = [];

      const tokens = new Map([
        ["base", { $value: "8" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetY: "{base}",
              color: "#FF0000",
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

      // Should have resolved tokens (parents only)
      expect(resolvedTokens).toContain("base");
      expect(resolvedTokens).toContain("shadow");

      // Should not have sub-fields in resolved callbacks
      expect(resolvedTokens).not.toContain("shadow.offsetY");
      expect(resolvedTokens).not.toContain("shadow.color");

      // Should have no errors
      expect(errorTokens).toHaveLength(0);
    });
  });

  describe("form use case - collecting field errors", () => {
    it("should allow collecting field-level errors for form validation", () => {
      const processor = new TokenResolver();
      const fieldErrors = new Map<string, Error>();

      const tokens = new Map([
        ["spacing.base", { $value: "8" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{spacing.base}", // Valid
              blur: "{missing}", // Error
              color: "#FF0000", // Valid
            },
          },
        ],
      ]);

      const callbacks = {
        onError: (_tokenName: string, error: Error, _originalValue: string, metadata?: any) => {
          if (metadata?.isSubField && metadata.parentToken === "shadow") {
            // Collect field-level errors for the form
            fieldErrors.set(metadata.fieldPath, error);
          }
        },
      };

      processor.processTokens(tokens, callbacks);

      // Field errors should contain only the erroring field
      expect(fieldErrors.size).toBe(1);
      expect(fieldErrors.has("blur")).toBe(true);
      expect(fieldErrors.has("offsetX")).toBe(false);
      expect(fieldErrors.has("offsetY")).toBe(false);
      expect(fieldErrors.has("color")).toBe(false);

      // Now you can use fieldErrors to highlight the specific field in the form
      const blurError = fieldErrors.get("blur");
      expect(blurError).toBeInstanceOf(Error);
    });

    it("should collect multiple field errors for complex forms", () => {
      const processor = new TokenResolver();
      const fieldErrors = new Map<string, Error>();

      const tokens = new Map([
        [
          "typography",
          {
            $type: "typography",
            $value: {
              "font-family": "Arial",
              "font-size": "{missing.size}", // Error
              "font-weight": "Bold",
              "line-height": "{missing.height}", // Error
            },
          },
        ],
      ]);

      const callbacks = {
        onError: (_tokenName: string, error: Error, _originalValue: string, metadata?: any) => {
          if (metadata?.isSubField && metadata.parentToken === "typography") {
            fieldErrors.set(metadata.fieldPath, error);
          }
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have errors for both failing fields
      expect(fieldErrors.size).toBe(2);
      expect(fieldErrors.has("font-size")).toBe(true);
      expect(fieldErrors.has("line-height")).toBe(true);
      expect(fieldErrors.has("font-family")).toBe(false);
      expect(fieldErrors.has("font-weight")).toBe(false);
    });
  });

  describe("combined callbacks", () => {
    it("should correctly distinguish between parent tokens and sub-fields in callbacks", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];
      const errorTokens: string[] = [];
      const subFieldErrors: string[] = [];

      const tokens = new Map([
        ["spacing.base", { $value: "8" }],
        ["color.red", { $value: "#FF0000" }],
        [
          "shadow.success",
          {
            $type: "shadow",
            $value: {
              offsetY: "{spacing.base}",
              color: "{color.red}",
            },
          },
        ],
        [
          "shadow.error",
          {
            $type: "shadow",
            $value: {
              offsetY: "{nonexistent}",
              color: "#0000FF",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
        onError: (tokenName: string, _error: Error, _originalValue: string, metadata?: any) => {
          errorTokens.push(tokenName);
          if (metadata?.isSubField) {
            subFieldErrors.push(tokenName);
          }
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have successfully resolved tokens (parents only)
      expect(resolvedTokens).toContain("spacing.base");
      expect(resolvedTokens).toContain("color.red");
      expect(resolvedTokens).toContain("shadow.success");

      // Should not have sub-fields of successful token in onResolve
      expect(resolvedTokens).not.toContain("shadow.success.offsetY");
      expect(resolvedTokens).not.toContain("shadow.success.color");

      // Should have error for parent token with failed sub-field
      expect(errorTokens).toContain("shadow.error");
      expect(errorTokens).toContain("nonexistent");

      // Should have sub-field error with metadata
      expect(subFieldErrors).toContain("shadow.error.offsetY");
      expect(errorTokens).toContain("shadow.error.offsetY");
    });

    it("should handle complex structured tokens with nested references", () => {
      const processor = new TokenResolver();
      const resolvedTokens: string[] = [];

      const tokens = new Map([
        ["base", { $value: "4" }],
        ["double", { $value: "{base} * 2" }],
        [
          "shadow",
          {
            $type: "shadow",
            $value: {
              offsetX: "0",
              offsetY: "{double}",
              blur: "{base} * 4",
            },
          },
        ],
      ]);

      const callbacks = {
        onResolve: (tokenName: string) => {
          resolvedTokens.push(tokenName);
        },
      };

      processor.processTokens(tokens, callbacks);

      // Should have all top-level tokens
      expect(resolvedTokens).toContain("base");
      expect(resolvedTokens).toContain("double");
      expect(resolvedTokens).toContain("shadow");

      // Should not have sub-fields
      expect(resolvedTokens).not.toContain("shadow.offsetX");
      expect(resolvedTokens).not.toContain("shadow.offsetY");
      expect(resolvedTokens).not.toContain("shadow.blur");

      // Should have exactly 3 tokens
      expect(resolvedTokens).toHaveLength(3);
    });
  });
});
