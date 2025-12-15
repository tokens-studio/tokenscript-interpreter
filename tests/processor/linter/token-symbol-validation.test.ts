import { ListSymbol, NumberSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { LintRunner, LintSeverity, TypeBasedRule } from "@src/processor/linter";
import type { TokenTypeValidator } from "@src/processor/linter/rules/TypeBasedRule";
import { processTokens } from "@src/processor/process";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

/**
 * Comprehensive TokenSymbol validation tests
 * 
 * TokenSymbol is the primary interface for linting structured tokens (typography, shadow, etc.).
 * It can hold either:
 * - Map<string, ISymbolType> for dictionary-based tokens (typography, single shadows)
 * - ISymbolType[] for array-based tokens (box-shadow with multiple shadows)
 * 
 * This test suite ensures validators can:
 * 1. Distinguish between Map-based and Array-based TokenSymbols
 * 2. Use TokenSymbol methods (.get, .keys, .values, .length) for validation
 * 3. Return field-level issues with path arrays (e.g., ["fontSize"] or [0, "blur"])
 * 4. Perform cross-field validation (e.g., lineHeight requires fontSize)
 * 5. Validate mixed field types (NumberSymbol, StringSymbol, etc.)
 * 6. Work with CRUD operations (create, update, delete)
 * 7. Access TokenSymbol attributes (subType, type)
 * 
 * Note: Array items in resolved tokens are typically DictionarySymbol, not TokenSymbol.
 * Validators should check for the existence of .get() method rather than instanceof checks.
 */

describe("TokenSymbol Validation", () => {
  describe("Map-based TokenSymbol validation", () => {
    const typographyValidator: TokenTypeValidator = (value, context, createIssue) => {
      // First check if value is TokenSymbol
      if (!(value instanceof TokenSymbol)) {
        return createIssue({
          code: "INVALID_TYPE",
          severity: LintSeverity.ERROR,
          message: "Expected structured token",
          tokenName: context.tokenName,
        });
      }

      // Check if value is a Map (dictionary-based token)
      if (!(value.value instanceof Map)) {
        return createIssue({
          code: "INVALID_STRUCTURE",
          severity: LintSeverity.ERROR,
          message: "Expected dictionary-based token",
          tokenName: context.tokenName,
        });
      }

      const issues = [];
      const fields = value.value as Map<string, any>;

      // Use TokenSymbol methods
      const fieldCount = value.length().value;
      if (fieldCount === 0) {
        issues.push(
          createIssue({
            code: "EMPTY_TOKEN",
            severity: LintSeverity.WARNING,
            message: "Token has no fields",
            tokenName: context.tokenName,
          }),
        );
      }

      // Use .get() method
      const fontSize = value.get("fontSize");
      if (fontSize instanceof NumberSymbol) {
        if (fontSize.value !== null && fontSize.value <= 0) {
          issues.push(
            createIssue({
              code: "INVALID_FONT_SIZE",
              severity: LintSeverity.ERROR,
              message: "Font size must be positive",
              tokenName: context.tokenName,
              path: ["fontSize"],
              data: { value: fontSize.value },
            }),
          );
        }
      }

      // Validate all fields using .keys() and .values()
      const keys = value.keys();
      const values = value.values();

      for (let i = 0; i < keys.value.length; i++) {
        const key = keys.value[i] as StringSymbol;
        const fieldValue = values.value[i];

        // Check for null values in any field
        if (fieldValue instanceof NumberSymbol && fieldValue.value === null) {
          issues.push(
            createIssue({
              code: "NULL_FIELD_VALUE",
              severity: LintSeverity.WARNING,
              message: `Field ${key.value} has null value`,
              tokenName: context.tokenName,
              path: [key.value as string],
            }),
          );
        }
      }

      return issues;
    };

    it("should validate TokenSymbol with Map value", () => {
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

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", typographyValidator),
      );
      const result = processTokens(tokens, { linter });

      expect(result.resolved.get("heading")).toBeInstanceOf(TokenSymbol);

      const issues = result.lint?.get("heading");
      expect(issues?.find((i) => i.code === "INVALID_FONT_SIZE")).toBeDefined();
    });

    it("should detect empty TokenSymbol", () => {
      const tokens = new Map<string, TokenData>([
        [
          "empty",
          {
            $type: "typography",
            $value: {},
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", typographyValidator),
      );
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("empty");
      expect(issues?.find((i) => i.code === "EMPTY_TOKEN")).toBeDefined();
    });

    it("should use TokenSymbol.get() method in validation", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: {
              fontSize: "16",
              lineHeight: "1.5",
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", typographyValidator),
      );
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("text") as TokenSymbol;
      expect(token).toBeInstanceOf(TokenSymbol);

      // Verify we can use .get() method
      const fontSize = token.get("fontSize");
      expect(fontSize).toBeInstanceOf(NumberSymbol);
      expect((fontSize as NumberSymbol).value).toBe(16);
    });

    it("should iterate over keys and values", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
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

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", typographyValidator),
      );
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("text") as TokenSymbol;

      const keys = token.keys();
      expect(keys).toBeInstanceOf(ListSymbol);
      expect(keys.value.length).toBe(3);

      const values = token.values();
      expect(values).toBeInstanceOf(ListSymbol);
      expect(values.value.length).toBe(3);
    });
  });

  describe("Array-based TokenSymbol validation", () => {
    const shadowArrayValidator: TokenTypeValidator = (value, context, createIssue) => {
      if (!(value instanceof TokenSymbol)) {
        return createIssue({
          code: "INVALID_TYPE",
          severity: LintSeverity.ERROR,
          message: "Expected structured token",
          tokenName: context.tokenName,
        });
      }

      // Check if value is an Array (list-based token like box-shadow)
      if (!Array.isArray(value.value)) {
        return createIssue({
          code: "INVALID_STRUCTURE",
          severity: LintSeverity.ERROR,
          message: "Expected array-based token",
          tokenName: context.tokenName,
        });
      }

      const issues = [];
      const shadows = value.value;

      // Use TokenSymbol.length() method
      const shadowCount = value.length().value;
      if (shadowCount === 0) {
        issues.push(
          createIssue({
            code: "EMPTY_SHADOW_ARRAY",
            severity: LintSeverity.WARNING,
            message: "Shadow array is empty",
            tokenName: context.tokenName,
          }),
        );
        return issues;
      }

      if (shadowCount > 10) {
        issues.push(
          createIssue({
            code: "TOO_MANY_SHADOWS",
            severity: LintSeverity.WARNING,
            message: "Too many shadows may impact performance",
            tokenName: context.tokenName,
            data: { count: shadowCount },
          }),
        );
      }

      // Validate each shadow in the array
      shadows.forEach((shadow, index) => {
        // Shadow items can be TokenSymbol or DictionarySymbol
        if (!(shadow instanceof TokenSymbol) && !shadow.get) return;

        // Use .get() with numeric index via the parent value
        const shadowItem = value.get(index);
        const blur = shadowItem.get("blur");
        if (blur instanceof NumberSymbol) {
          if (blur.value !== null && blur.value < 0) {
            issues.push(
              createIssue({
                code: "NEGATIVE_BLUR",
                severity: LintSeverity.ERROR,
                message: `Shadow at index ${index} has negative blur`,
                tokenName: context.tokenName,
                path: [index, "blur"], // Array index in path
                data: { index, value: blur.value },
              }),
            );
          }
        }

        const offsetX = shadowItem.get("offsetX");
        if (offsetX instanceof NumberSymbol) {
          if (offsetX.value !== null && Math.abs(offsetX.value) > 500) {
            issues.push(
              createIssue({
                code: "EXTREME_OFFSET",
                severity: LintSeverity.WARNING,
                message: `Shadow at index ${index} has extreme offset`,
                tokenName: context.tokenName,
                path: [index, "offsetX"],
                data: { index, value: offsetX.value },
              }),
            );
          }
        }

        const color = shadowItem.get("color");
        if (color instanceof StringSymbol) {
          if (!color.value || !color.value.startsWith("#")) {
            issues.push(
              createIssue({
                code: "INVALID_COLOR",
                severity: LintSeverity.ERROR,
                message: `Shadow at index ${index} has invalid color`,
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

    it("should validate array-based TokenSymbol", () => {
      const tokens = new Map<string, TokenData>([
        [
          "card-shadow",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "0",
                offsetY: "2",
                blur: "4",
                color: "#000000",
              },
              {
                offsetX: "0",
                offsetY: "4",
                blur: "-8", // Invalid
                color: "#000000",
              },
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("shadow", shadowArrayValidator),
      );
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("card-shadow");
      expect(token).toBeInstanceOf(TokenSymbol);
      expect(Array.isArray((token as TokenSymbol).value)).toBe(true);

      const issues = result.lint?.get("card-shadow");
      expect(issues).toBeDefined();

      // Check that path includes array index
      const blurIssue = issues?.find((i) => i.code === "NEGATIVE_BLUR");
      expect(blurIssue).toBeDefined();
      expect(blurIssue?.path).toEqual([1, "blur"]); // Index 1, field "blur"
    });

    it("should validate with nested array paths", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadows",
          {
            $type: "shadow",
            $value: [
              {
                offsetX: "1000", // Extreme value
                offsetY: "0",
                blur: "10",
                color: "red", // Invalid format
              },
            ],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("shadow", shadowArrayValidator),
      );
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("shadows");
      expect(issues?.length).toBeGreaterThan(0);

      // Find issues with array paths
      const offsetIssue = issues?.find((i) => i.code === "EXTREME_OFFSET");
      expect(offsetIssue?.path).toEqual([0, "offsetX"]);

      const colorIssue = issues?.find((i) => i.code === "INVALID_COLOR");
      expect(colorIssue?.path).toEqual([0, "color"]);
    });

    it("should use TokenSymbol.length() for array validation", () => {
      const tokens = new Map<string, TokenData>([
        [
          "many-shadows",
          {
            $type: "shadow",
            $value: Array(15).fill({
              offsetX: "0",
              offsetY: "0",
              blur: "10",
              color: "#000000",
            }),
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("shadow", shadowArrayValidator),
      );
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("many-shadows");
      expect(issues?.find((i) => i.code === "TOO_MANY_SHADOWS")).toBeDefined();
    });

    it("should detect empty array", () => {
      const tokens = new Map<string, TokenData>([
        [
          "empty-shadows",
          {
            $type: "shadow",
            $value: [],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("shadow", shadowArrayValidator),
      );
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("empty-shadows");
      expect(issues?.find((i) => i.code === "EMPTY_SHADOW_ARRAY")).toBeDefined();
    });
  });

  describe("Cross-field validation", () => {
    const crossFieldValidator: TokenTypeValidator = (value, context, createIssue) => {
      if (!(value instanceof TokenSymbol)) return null;
      if (!(value.value instanceof Map)) return null;

      const issues = [];

      // Cross-field validation: lineHeight requires fontSize
      const lineHeight = value.get("lineHeight");
      const fontSize = value.get("fontSize");

      // Check if lineHeight exists and has a value
      const hasLineHeight =
        lineHeight instanceof NumberSymbol && lineHeight.value !== null;
      
      // Check if fontSize exists and has a value (or is missing/null)
      const hasFontSize =
        fontSize instanceof NumberSymbol && fontSize.value !== null;

      if (hasLineHeight && !hasFontSize) {
        issues.push(
          createIssue({
            code: "MISSING_FONT_SIZE",
            severity: LintSeverity.WARNING,
            message: "Line height requires font-size to be set",
            tokenName: context.tokenName,
            // No path = issue applies to whole token
          }),
        );
      }

      // Cross-field validation: fontSize and lineHeight relationship
      if (
        fontSize instanceof NumberSymbol &&
        lineHeight instanceof NumberSymbol &&
        fontSize.value !== null &&
        lineHeight.value !== null
      ) {
        const absoluteLineHeight = lineHeight.value * fontSize.value;
        if (absoluteLineHeight < fontSize.value) {
          issues.push(
            createIssue({
              code: "LINE_HEIGHT_TOO_TIGHT",
              severity: LintSeverity.WARNING,
              message: "Line height is smaller than font size",
              tokenName: context.tokenName,
              data: {
                fontSize: fontSize.value,
                lineHeight: lineHeight.value,
                absoluteLineHeight,
              },
            }),
          );
        }
      }

      return issues;
    };

    it("should validate cross-field dependencies", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: {
              lineHeight: "1.5", // Has lineHeight but no fontSize
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", crossFieldValidator),
      );
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("text");
      expect(issues?.find((i) => i.code === "MISSING_FONT_SIZE")).toBeDefined();
    });

    it("should validate cross-field relationships", () => {
      const tokens = new Map<string, TokenData>([
        [
          "tight-text",
          {
            $type: "typography",
            $value: {
              fontSize: "16",
              lineHeight: "0.5", // Too tight!
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", crossFieldValidator),
      );
      const result = processTokens(tokens, { linter });

      const issues = result.lint?.get("tight-text");
      expect(issues?.find((i) => i.code === "LINE_HEIGHT_TOO_TIGHT")).toBeDefined();
    });
  });

  describe("Mixed field types validation", () => {
    const mixedFieldValidator: TokenTypeValidator = (value, context, createIssue) => {
      if (!(value instanceof TokenSymbol)) return null;
      if (!(value.value instanceof Map)) return null;

      const issues = [];

      // Validate different field types
      const fontSize = value.get("fontSize");
      if (fontSize && !(fontSize instanceof NumberSymbol)) {
        issues.push(
          createIssue({
            code: "WRONG_TYPE",
            severity: LintSeverity.ERROR,
            message: "fontSize must be a number",
            tokenName: context.tokenName,
            path: ["fontSize"],
          }),
        );
      }

      const fontFamily = value.get("fontFamily");
      if (fontFamily && !(fontFamily instanceof StringSymbol)) {
        issues.push(
          createIssue({
            code: "WRONG_TYPE",
            severity: LintSeverity.ERROR,
            message: "fontFamily must be a string",
            tokenName: context.tokenName,
            path: ["fontFamily"],
          }),
        );
      }

      // Check for string values in fontSize
      if (fontSize instanceof StringSymbol) {
        issues.push(
          createIssue({
            code: "STRING_NOT_NUMBER",
            severity: LintSeverity.ERROR,
            message: "fontSize should be numeric, not string",
            tokenName: context.tokenName,
            path: ["fontSize"],
            data: { value: fontSize.value },
          }),
        );
      }

      return issues;
    };

    it("should validate field types", () => {
      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: {
              fontSize: "16",
              fontFamily: "Arial",
            },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", mixedFieldValidator),
      );
      const result = processTokens(tokens, { linter });

      // Should resolve without errors
      expect(result.errors.size).toBe(0);
      expect(result.resolved.get("text")).toBeInstanceOf(TokenSymbol);
    });
  });

  describe("CRUD operations with TokenSymbol", () => {
    const validator: TokenTypeValidator = (value, context, createIssue) => {
      if (!(value instanceof TokenSymbol)) return null;

      const issues = [];

      if (Array.isArray(value.value)) {
        // Array validation
        value.value.forEach((item, index) => {
          // Items can be TokenSymbol or DictionarySymbol
          if (!item.get) return;
          const blur = item.get("blur");
          if (blur instanceof NumberSymbol && blur.value !== null && blur.value < 0) {
            issues.push(
              createIssue({
                code: "NEGATIVE_BLUR",
                severity: LintSeverity.ERROR,
                message: "Blur cannot be negative",
                tokenName: context.tokenName,
                path: [index, "blur"],
              }),
            );
          }
        });
      } else if (value.value instanceof Map) {
        // Map validation
        const fontSize = value.get("fontSize");
        if (fontSize instanceof NumberSymbol && fontSize.value !== null && fontSize.value <= 0) {
          issues.push(
            createIssue({
              code: "INVALID_FONT_SIZE",
              severity: LintSeverity.ERROR,
              message: "Font size must be positive",
              tokenName: context.tokenName,
              path: ["fontSize"],
            }),
          );
        }
      }

      return issues;
    };

    it("should validate during createToken with Map-based TokenSymbol", () => {
      const linter = new LintRunner().addRule(new TypeBasedRule().forType("typography", validator));
      const resolver = new TokenResolver();
      resolver.build(new Map(), undefined, undefined, linter);

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
      expect(result.resolvedValue).toBeInstanceOf(TokenSymbol);
      expect(result.lintIssues?.get("heading")).toBeDefined();
    });

    it("should validate during updateToken with array-based TokenSymbol", () => {
      const tokens = new Map<string, TokenData>([
        [
          "shadow",
          {
            $type: "shadow",
            $value: [{ offsetX: "0", offsetY: "0", blur: "10", color: "#000" }],
          },
        ],
      ]);

      const linter = new LintRunner().addRule(new TypeBasedRule().forType("shadow", validator));
      const resolver = new TokenResolver();
      resolver.build(tokens, undefined, undefined, linter);

      const result = resolver.updateToken({
        tokenPath: "shadow",
        tokenData: {
          $type: "shadow",
          $value: [{ offsetX: "0", offsetY: "0", blur: "-5", color: "#000" }],
        },
      });

      expect(result.updated).toBe(true);
      expect(result.resolvedValue).toBeInstanceOf(TokenSymbol);

      const issues = result.lintIssues?.get("shadow");
      expect(issues?.find((i) => i.code === "NEGATIVE_BLUR")).toBeDefined();
    });
  });

  describe("TokenSymbol attribute access", () => {
    it("should validate using hasAttribute and getAttribute", () => {
      const attributeValidator: TokenTypeValidator = (value, context, createIssue) => {
        if (!(value instanceof TokenSymbol)) return null;

        const issues = [];

        // Check subType attribute
        if (value.hasAttribute("subType")) {
          const subType = value.getAttribute("subType");
          if (subType instanceof StringSymbol) {
            // Could validate subType here
            if (subType.value !== "typography") {
              issues.push(
                createIssue({
                  code: "WRONG_SUBTYPE",
                  severity: LintSeverity.WARNING,
                  message: `Expected typography subType, got ${subType.value}`,
                  tokenName: context.tokenName,
                }),
              );
            }
          }
        }

        return issues;
      };

      const tokens = new Map<string, TokenData>([
        [
          "text",
          {
            $type: "typography",
            $value: { fontSize: "16" },
          },
        ],
      ]);

      const linter = new LintRunner().addRule(
        new TypeBasedRule().forType("typography", attributeValidator),
      );
      const result = processTokens(tokens, { linter });

      const token = result.resolved.get("text");
      expect(token).toBeInstanceOf(TokenSymbol);
      expect((token as TokenSymbol).hasAttribute("subType")).toBe(true);
    });
  });
});
