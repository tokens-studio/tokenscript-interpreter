import { describe, expect, it } from "vitest";
import { interpretTokens } from "@src/tokenset-processor";
import { flattenTokens, hasNestedStructure } from "@src/utils/tokens-json-adapter";

describe("Tokens JSON Format Compatibility", () => {
  describe("interpretTokens", () => {
    it("should handle standard tokens JSON format ($value/$type)", () => {
      const tokens = {
        "primary-color": {
          "$value": "#ff6b35",
          "$type": "color"
        },
        "base-spacing": {
          "$value": "16px",
          "$type": "dimension"
        },
        "large-spacing": {
          "$value": "{base-spacing} * 2",
          "$type": "dimension"
        }
      };

      const result = interpretTokens(tokens);

      expect(result).toEqual({
        "primary-color": "#ff6b35",
        "base-spacing": "16px",
        "large-spacing": "32px"
      });
    });

    it("should handle non-standard format (value/type)", () => {
      const tokens = {
        "primary-color": {
          "value": "#ff6b35",
          "type": "color"
        },
        "base-spacing": {
          "value": "16px",
          "type": "dimension"
        },
        "large-spacing": {
          "value": "{base-spacing} * 2",
          "type": "dimension"
        }
      };

      const result = interpretTokens(tokens);

      expect(result).toEqual({
        "primary-color": "#ff6b35",
        "base-spacing": "16px",
        "large-spacing": "32px"
      });
    });

    it("should produce identical results for both formats", () => {
      const standardTokens = {
        "color-primary": {
          "$value": "#3b82f6",
          "$type": "color"
        },
        "spacing-base": {
          "$value": "8px",
          "$type": "dimension"
        },
        "spacing-large": {
          "$value": "{spacing-base} * 3",
          "$type": "dimension"
        }
      };

      const nonStandardTokens = {
        "color-primary": {
          "value": "#3b82f6",
          "type": "color"
        },
        "spacing-base": {
          "value": "8px",
          "type": "dimension"
        },
        "spacing-large": {
          "value": "{spacing-base} * 3",
          "type": "dimension"
        }
      };

      const standardResult = interpretTokens(standardTokens);
      const nonStandardResult = interpretTokens(nonStandardTokens);

      expect(standardResult).toEqual(nonStandardResult);
      expect(standardResult).toEqual({
        "color-primary": "#3b82f6",
        "spacing-base": "8px",
        "spacing-large": "24px"
      });
    });

    it("should handle mixed format within same token set", () => {
      const mixedTokens = {
        "standard-token": {
          "$value": "#ff0000",
          "$type": "color"
        },
        "non-standard-token": {
          "value": "12px",
          "type": "dimension"
        },
        "derived-token": {
          "$value": "{non-standard-token} * 2",
          "$type": "dimension"
        }
      };

      const result = interpretTokens(mixedTokens);

      expect(result).toEqual({
        "standard-token": "#ff0000",
        "non-standard-token": "12px",
        "derived-token": "24px"
      });
    });

    it("should handle nested tokens JSON structure with standard format", () => {
      const nestedTokens = {
        "color": {
          "primary": {
            "$value": "#3b82f6",
            "$type": "color"
          },
          "secondary": {
            "$value": "#64748b",
            "$type": "color"
          }
        },
        "spacing": {
          "base": {
            "$value": "16px",
            "$type": "dimension"
          },
          "large": {
            "$value": "{spacing.base} * 1.5",
            "$type": "dimension"
          }
        }
      };

      const result = interpretTokens(nestedTokens);

      expect(result).toEqual({
        "color.primary": "#3b82f6",
        "color.secondary": "#64748b",
        "spacing.base": "16px",
        "spacing.large": "24px"
      });
    });

    it("should handle nested tokens JSON structure with non-standard format", () => {
      const nestedTokens = {
        "color": {
          "primary": {
            "value": "#3b82f6",
            "type": "color"
          },
          "secondary": {
            "value": "#64748b",
            "type": "color"
          }
        },
        "spacing": {
          "base": {
            "value": "16px",
            "type": "dimension"
          },
          "large": {
            "value": "{spacing.base} * 1.5",
            "type": "dimension"
          }
        }
      };

      const result = interpretTokens(nestedTokens);

      expect(result).toEqual({
        "color.primary": "#3b82f6",
        "color.secondary": "#64748b",
        "spacing.base": "16px",
        "spacing.large": "24px"
      });
    });

    it("should handle complex token references in both formats", () => {
      const tokens = {
        "base-value": {
          "$value": "10",
          "$type": "number"
        },
        "multiplier": {
          "value": "1.5",
          "type": "number"
        },
        "unit": {
          "$value": "px",
          "$type": "string"
        },
        "calculated": {
          "value": "{base-value} * {multiplier}{unit}",
          "type": "dimension"
        }
      };

      const result = interpretTokens(tokens);

      expect(result).toEqual({
        "base-value": "10",
        "multiplier": "1.5",
        "unit": "px",
        "calculated": "15 px" // String concatenation produces space between number and unit
      });
    });

    it("should handle flat token structure (no nested objects)", () => {
      const flatTokens = {
        "primary-color": "#ff6b35",
        "base-spacing": "16px",
        "large-spacing": "{base-spacing} * 2"
      };

      const result = interpretTokens(flatTokens);

      expect(result).toEqual({
        "primary-color": "#ff6b35",
        "base-spacing": "16px",
        "large-spacing": "32px"
      });
    });

    it("should handle edge case with empty values", () => {
      const tokens = {
        "empty-standard": {
          "$value": "",
          "$type": "string"
        },
        "empty-non-standard": {
          "value": "",
          "type": "string"
        }
      };

      const result = interpretTokens(tokens);

      expect(result).toEqual({
        "empty-standard": "",
        "empty-non-standard": ""
      });
    });

    it("should handle tokens with only metadata", () => {
      const tokens = {
        "metadata-only": {
          "$description": "This token has no value",
          "$extensions": {
            "custom": "data"
          }
        },
        "with-value": {
          "$value": "test",
          "$type": "string",
          "$description": "This token has a value"
        }
      };

      const result = interpretTokens(tokens);

      expect(result).toEqual({
        "with-value": "test"
      });
      // metadata-only should not appear in results
      expect(result).not.toHaveProperty("metadata-only");
    });

    it("should prioritize $value over value when both exist", () => {
      const conflictTokens = {
        "conflict-token": {
          "$value": "standard-wins",
          "$type": "string",
          "value": "non-standard-loses",
          "type": "string"
        }
      };

      const result = interpretTokens(conflictTokens);

      expect(result).toEqual({
        "conflict-token": "standard-wins"
      });
    });
  });

  describe("flattenTokens", () => {
    it("should flatten standard tokens JSON format", () => {
      const nestedTokens = {
        "color": {
          "primary": {
            "$value": "#3b82f6",
            "$type": "color"
          }
        }
      };

      const flattened = flattenTokens(nestedTokens);

      expect(flattened).toEqual({
        "color.primary": "#3b82f6"
      });
    });

    it("should flatten non-standard format", () => {
      const nestedTokens = {
        "color": {
          "primary": {
            "value": "#3b82f6",
            "type": "color"
          }
        }
      };

      const flattened = flattenTokens(nestedTokens);

      expect(flattened).toEqual({
        "color.primary": "#3b82f6"
      });
    });

    it("should skip tokens JSON metadata keys", () => {
      const tokensWithMetadata = {
        "$themes": ["light", "dark"],
        "$metadata": {
          "version": "1.0.0"
        },
        "color": {
          "$description": "Color tokens",
          "primary": {
            "$value": "#3b82f6",
            "$type": "color",
            "$description": "Primary color"
          }
        }
      };

      const flattened = flattenTokens(tokensWithMetadata);

      expect(flattened).toEqual({
        "color.primary": "#3b82f6"
      });
      expect(flattened).not.toHaveProperty("$themes");
      expect(flattened).not.toHaveProperty("$metadata");
      expect(flattened).not.toHaveProperty("color.$description");
    });

    it("should handle deeply nested structures", () => {
      const deeplyNested = {
        "design": {
          "system": {
            "tokens": {
              "spacing": {
                "base": {
                  "$value": "8px",
                  "$type": "dimension"
                }
              }
            }
          }
        }
      };

      const flattened = flattenTokens(deeplyNested);

      expect(flattened).toEqual({
        "design.system.tokens.spacing.base": "8px"
      });
    });
  });

  describe("hasNestedStructure", () => {
    it("should detect nested tokens JSON structure", () => {
      const nested = {
        "color": {
          "primary": {
            "$value": "#3b82f6"
          }
        }
      };

      expect(hasNestedStructure(nested)).toBe(true);
    });

    it("should not detect nested structure in flat tokens", () => {
      const flat = {
        "color-primary": "#3b82f6",
        "spacing-base": "16px"
      };

      expect(hasNestedStructure(flat)).toBe(false);
    });

    it("should not detect nested structure when only tokens JSON metadata exists", () => {
      const metadataOnly = {
        "$themes": ["light", "dark"],
        "$metadata": {
          "version": "1.0.0"
        }
      };

      expect(hasNestedStructure(metadataOnly)).toBe(false);
    });

    it("should detect mixed structure", () => {
      const mixed = {
        "$themes": ["light", "dark"],
        "color": {
          "primary": {
            "$value": "#3b82f6"
          }
        }
      };

      expect(hasNestedStructure(mixed)).toBe(true);
    });
  });
});