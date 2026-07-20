import { Config } from "@interpreter/config";
import type { TokenManager } from "@interpreter/config/managers/token/manager";
import { DictionarySymbol, NumberSymbol, NumberWithUnitSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { beforeEach, describe, expect, it } from "vitest";

// Inline schemas for testing - actual schemas are proprietary
const fontSizeSchema = {
  name: "fontSize",
  type: "token",
  description: "Represents a font size value. Supports px, rem, em, %, vw, vh.",
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `// Validation for font-size values.
if (is_number({input})) [
  if ({input} <= 0) [
    return "INVALID_FONT_SIZE_NON_POSITIVE";
  ];
  return true;
];

variable input_type: String = type({input});
if (input_type == "px" || input_type == "rem" || input_type == "em" || input_type == "%" || input_type == "vw" || input_type == "vh") [
  if ({input}.value <= 0) [
    return "INVALID_FONT_SIZE_NON_POSITIVE";
  ];
  return true;
];

return "INVALID_FONT_SIZE_TYPE";
`,
  },
};

const fontWeightSchema = {
  name: "fontWeight",
  type: "token",
  description: "Represents a font weight value. Always a string - numeric (100-1000) or named.",
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `// Validation for font-weight values.
if (is_number({input})) [
  if ({input} < 100 || {input} > 900) [
    return "INVALID_FONT_WEIGHT_RANGE";
  ];
  return true;
];

if (is_string({input})) [
  if ({input} == "thin" || {input} == "hairline") [
    return true;
  ];
  if ({input} == "extra-light" || {input} == "ultra-light") [
    return true;
  ];
  if ({input} == "light") [
    return true;
  ];
  if ({input} == "normal" || {input} == "regular") [
    return true;
  ];
  if ({input} == "medium") [
    return true;
  ];
  if ({input} == "semi-bold" || {input} == "demi-bold") [
    return true;
  ];
  if ({input} == "bold") [
    return true;
  ];
  if ({input} == "extra-bold" || {input} == "ultra-bold") [
    return true;
  ];
  if ({input} == "black" || {input} == "heavy") [
    return true;
  ];
  if ({input} == "extra-black" || {input} == "ultra-black") [
    return true;
  ];
  return "INVALID_FONT_WEIGHT_VALUE";
];

return "INVALID_FONT_WEIGHT_TYPE";
`,
  },
};

const typographySchema = {
  name: "typography",
  type: "token",
  description: "Represents a complete typographic style (composite type).",
  schema: {
    type: "object",
    properties: {
      fontFamily: {
        type: "token",
        url: "/api/v1/core/fontFamily/",
      },
      fontSize: {
        type: "token",
        url: "/api/v1/core/fontSize/",
      },
      fontWeight: {
        type: "token",
        url: "/api/v1/core/fontWeight/",
      },
      lineHeight: {
        type: "token",
        url: "/api/v1/core/lineHeight/",
      },
      letterSpacing: {
        type: "token",
        url: "/api/v1/core/letterSpacing/",
      },
      paragraphSpacing: {
        type: "token",
        url: "/api/v1/core/dimension/",
      },
      textCase: {
        type: "token",
        url: "/api/v1/core/textCase/",
      },
      textDecoration: {
        type: "token",
        url: "/api/v1/core/textDecoration/",
      },
    },
  },
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `// Validation for typography values.
// Accept dictionaries and token wrappers (cross-engine safe: Go's type() on a
// token wrapper returns the base type "token", so use is_token()).
if (!is_dictionary({input}) && !is_token({input})) [
  return "INVALID_TYPOGRAPHY_TYPE";
];

return true;
`,
  },
};

describe("Nested Token Validation", () => {
  describe("TokenManager.validate() with nested properties", () => {
    let config: Config;
    let manager: TokenManager;

    beforeEach(() => {
      config = new Config();
      manager = config.tokenManager;

      // Register token specs from built schemas
      manager.register("/api/v1/core/fontSize/", fontSizeSchema as any);
      manager.register("/api/v1/core/fontWeight/", fontWeightSchema as any);
      manager.register("/api/v1/core/typography/", typographySchema as any);
    });

    describe("valid nested tokens", () => {
      it("should pass validation for valid nested token values", () => {
        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new NumberWithUnitSymbol(16, "px")],
            ["fontWeight", new NumberSymbol(400)],
          ]),
        );

        const results = manager.validate("typography", value);

        expect(results).toHaveLength(1);
        expect(results[0].valid).toBe(true);
      });

      it("should pass when nested properties are missing (optional)", () => {
        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new NumberWithUnitSymbol(16, "px")],
            // fontWeight missing - should still pass
          ]),
        );

        const results = manager.validate("typography", value);

        expect(results).toHaveLength(1);
        expect(results[0].valid).toBe(true);
      });

      it("should pass for TokenSymbol wrapper", () => {
        const innerValue = new Map<string, any>([
          ["fontSize", new NumberWithUnitSymbol(16, "px")],
          ["fontWeight", new NumberSymbol(400)],
        ]);
        const value = new TokenSymbol("typography", innerValue, config);

        const results = manager.validate("typography", value);

        expect(results).toHaveLength(1);
        expect(results[0].valid).toBe(true);
      });
    });

    describe("invalid nested tokens", () => {
      it("should report nested validation errors with paths", () => {
        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new NumberSymbol(-10)], // Invalid: negative/zero
            ["fontWeight", new NumberSymbol(400)],
          ]),
        );

        const results = manager.validate("typography", value);

        // Should have exactly one failure
        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(1);
        expect(failures[0].path).toEqual(["fontSize"]);
        expect(failures[0].error).toBe("INVALID_FONT_SIZE_NON_POSITIVE");
        expect(failures[0].tokenType).toBe("fontSize");
      });

      it("should aggregate multiple nested errors", () => {
        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new NumberSymbol(-10)], // Invalid
            ["fontWeight", new NumberSymbol(50)], // Invalid: < 100
          ]),
        );

        const results = manager.validate("typography", value);

        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(2);

        const fontSizeError = failures.find((e) => e.path?.[0] === "fontSize");
        const fontWeightError = failures.find((e) => e.path?.[0] === "fontWeight");

        expect(fontSizeError).toBeDefined();
        expect(fontSizeError!.error).toBe("INVALID_FONT_SIZE_NON_POSITIVE");

        expect(fontWeightError).toBeDefined();
        expect(fontWeightError!.error).toBe("INVALID_FONT_WEIGHT_RANGE");
      });

      it("should report type errors for invalid nested types", () => {
        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new StringSymbol("not-a-size")],
            ["fontWeight", new NumberSymbol(400)],
          ]),
        );

        const results = manager.validate("typography", value);

        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(1);
        expect(failures[0].path).toEqual(["fontSize"]);
        expect(failures[0].error).toBe("INVALID_FONT_SIZE_TYPE");
      });
    });

    describe("circular reference detection", () => {
      it("should detect and report circular references", () => {
        // Register a self-referencing token spec
        manager.register("/api/v1/core/recursive/", {
          name: "recursive",
          type: "token",
          schema: {
            type: "object",
            properties: {
              nested: { type: "token", url: "/api/v1/core/recursive/" },
            },
          },
        });

        // Create nested structure: { nested: { nested: {} } }
        const innerMost = new DictionarySymbol(new Map());
        const innerValue = new DictionarySymbol(new Map<string, any>([["nested", innerMost]]));
        const value = new DictionarySymbol(new Map<string, any>([["nested", innerValue]]));

        const results = manager.validate("recursive", value);

        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(1);
        expect(failures[0].error).toBe("CIRCULAR_REFERENCE");
        // Path is ["nested", "nested"] because circular ref is detected at 2nd level
        expect(failures[0].path).toEqual(["nested", "nested"]);
      });
    });

    describe("max depth protection", () => {
      it("should return error when max validation depth is exceeded", () => {
        // Register chain of token specs that reference each other (not circular)
        for (let i = 0; i <= 12; i++) {
          const nextUrl = i < 12 ? `/api/v1/core/level${i + 1}/` : undefined;
          manager.register(`/api/v1/core/level${i}/`, {
            name: `level${i}`,
            type: "token",
            schema: nextUrl
              ? {
                  type: "object",
                  properties: {
                    child: { type: "token", url: nextUrl },
                  },
                }
              : { type: "object" },
          });
        }

        // Create deeply nested value (13 levels deep)
        let value: DictionarySymbol = new DictionarySymbol(new Map());
        for (let i = 12; i >= 0; i--) {
          value = new DictionarySymbol(new Map<string, any>([["child", value]]));
        }

        const results = manager.validate("level0", value);

        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(1);
        expect(failures[0].error).toBe("MAX_VALIDATION_DEPTH_EXCEEDED");
      });
    });

    describe("deeply nested validation", () => {
      beforeEach(() => {
        // Register an intermediate token type
        manager.register("/api/v1/core/font_config/", {
          name: "font_config",
          type: "token",
          schema: {
            type: "object",
            properties: {
              size: { type: "token", url: "/api/v1/core/fontSize/" },
              weight: { type: "token", url: "/api/v1/core/fontWeight/" },
            },
          },
        });

        // Register a deeply nested token type
        manager.register("/api/v1/core/typography_advanced/", {
          name: "typography_advanced",
          type: "token",
          schema: {
            type: "object",
            properties: {
              font: { type: "token", url: "/api/v1/core/font_config/" },
            },
          },
        });
      });

      it("should validate multiple levels deep", () => {
        const fontConfig = new DictionarySymbol(
          new Map([
            ["size", new NumberSymbol(-10)], // Invalid at depth 2
            ["weight", new NumberSymbol(400)],
          ]),
        );

        const value = new DictionarySymbol(new Map([["font", fontConfig]]));

        const results = manager.validate("typography_advanced", value);

        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(1);
        expect(failures[0].path).toEqual(["font", "size"]);
        expect(failures[0].error).toBe("INVALID_FONT_SIZE_NON_POSITIVE");
      });

      it("should aggregate errors from multiple depths", () => {
        const fontConfig = new DictionarySymbol(
          new Map([
            ["size", new NumberSymbol(-10)], // Invalid
            ["weight", new NumberSymbol(50)], // Invalid
          ]),
        );

        const value = new DictionarySymbol(new Map([["font", fontConfig]]));

        const results = manager.validate("typography_advanced", value);

        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(2);

        const sizeError = failures.find((e) => e.path?.length === 2 && e.path[0] === "font" && e.path[1] === "size");
        const weightError = failures.find((e) => e.path?.length === 2 && e.path[0] === "font" && e.path[1] === "weight");

        expect(sizeError).toBeDefined();
        expect(weightError).toBeDefined();
      });
    });

    describe("missing nested specs", () => {
      it("should skip validation for unregistered nested specs", () => {
        manager.register("/api/v1/core/partial_typography/", {
          name: "partial_typography",
          type: "token",
          schema: {
            type: "object",
            properties: {
              fontSize: { type: "token", url: "/api/v1/core/unregistered_token/" },
            },
          },
        });

        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new NumberSymbol(-10)], // Would be invalid if spec existed
          ]),
        );

        // Should pass because the nested spec isn't registered
        const results = manager.validate("partial_typography", value);
        expect(results).toHaveLength(1);
        expect(results[0].valid).toBe(true);
      });
    });

    describe("non-token properties", () => {
      it("should not validate properties without type: token", () => {
        manager.register("/api/v1/core/mixed_spec/", {
          name: "mixed_spec",
          type: "token",
          schema: {
            type: "object",
            properties: {
              fontSize: { type: "token", url: "/api/v1/core/fontSize/" },
              label: { type: "string" }, // Not a token type
            },
          },
        });

        const value = new DictionarySymbol(
          new Map([
            ["fontSize", new NumberWithUnitSymbol(16, "px")],
            ["label", new StringSymbol("any value")], // Should not be validated
          ]),
        );

        const results = manager.validate("mixed_spec", value);
        expect(results).toHaveLength(1);
        expect(results[0].valid).toBe(true);
      });
    });
  });
});
