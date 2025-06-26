import { describe, expect, it } from 'vitest';
import { interpretTokens, processTokensFromJson, processSingleTokenSet } from '../tokenset-processor';

describe('JSON Blob API', () => {
  describe('interpretTokens', () => {
    it('should process flat token sets', () => {
      const flatTokens = {
        "spacing.small": "8px",
        "spacing.medium": "{spacing.small} * 2",
        "spacing.large": "{spacing.medium} * 1.5",
        "color.primary": "#0066cc",
        "color.secondary": "{color.primary}"
      };

      const result = interpretTokens(flatTokens);

      expect(result).toEqual({
        "spacing.small": "8px",
        "spacing.medium": "16px",
        "spacing.large": "24px",
        "color.primary": "#0066cc",
        "color.secondary": "#0066cc"
      });
    });

    it('should process DTCG format without themes', () => {
      const dtcgTokens = {
        "spacing": {
          "small": {
            "$type": "dimension",
            "$value": "8px"
          },
          "medium": {
            "$type": "dimension",
            "$value": "{spacing.small} * 2"
          }
        },
        "color": {
          "primary": {
            "$type": "color",
            "$value": "#0066cc"
          },
          "secondary": {
            "$type": "color",
            "$value": "{color.primary}"
          }
        }
      };

      const result = interpretTokens(dtcgTokens);

      expect(result["spacing.small"]).toBe("8px");
      expect(result["spacing.medium"]).toBe("16px");
      expect(result["color.primary"]).toBe("#0066cc");
      expect(result["color.secondary"]).toBe("#0066cc");
    });

    it('should process DTCG format with themes', () => {
      const dtcgWithThemes = {
        "spacing": {
          "small": {
            "$type": "dimension",
            "$value": "8px"
          },
          "medium": {
            "$type": "dimension",
            "$value": "{spacing.small} * 2"
          }
        },
        "color": {
          "primary": {
            "$type": "color",
            "$value": "#0066cc"
          }
        },
        "$themes": [
          {
            "name": "light",
            "selectedTokenSets": [
              {"id": "spacing", "status": "enabled"},
              {"id": "color", "status": "enabled"}
            ]
          }
        ]
      };

      const result = interpretTokens(dtcgWithThemes);

      expect(result).toHaveProperty("light");
      expect(result.light["small"]).toBe("8px");
      expect(result.light["primary"]).toBe("#0066cc");
      // Note: medium token has unresolved reference, so it might not be present
    });

    it('should handle complex token references', () => {
      const complexTokens = {
        "base.size": "16",
        "scale.ratio": "1.25",
        "spacing.xs": "{base.size} / 2 px",
        "spacing.sm": "{base.size} px",
        "spacing.md": "{base.size} * {scale.ratio} px",
        "spacing.lg": "{spacing.md} * {scale.ratio} px"
      };

      const result = interpretTokens(complexTokens);

      expect(result["base.size"]).toBe("16");
      expect(result["scale.ratio"]).toBe("1.25");
      expect(result["spacing.xs"]).toBe("8px");
      expect(result["spacing.sm"]).toBe("16px");
      expect(result["spacing.md"]).toBe("20px");
      expect(result["spacing.lg"]).toBe("25px");
    });

    it('should throw error for invalid input', () => {
      expect(() => interpretTokens(null as any)).toThrow("Invalid JSON input: Expected an object");
      expect(() => interpretTokens("string" as any)).toThrow("Invalid JSON input: Expected an object");
      expect(() => interpretTokens(123 as any)).toThrow("Invalid JSON input: Expected an object");
    });

    it('should handle empty objects', () => {
      const result = interpretTokens({});
      expect(result).toEqual({});
    });

    it('should handle tokens with no references', () => {
      const simpleTokens = {
        "color.red": "#ff0000",
        "color.blue": "#0000ff",
        "spacing.small": "8px"
      };

      const result = interpretTokens(simpleTokens);

      expect(result).toEqual({
        "color.red": "#ff0000",
        "color.blue": "#0000ff",
        "spacing.small": "8px"
      });
    });
  });

  describe('processTokensFromJson (backward compatibility)', () => {
    it('should work the same as interpretTokens', () => {
      const tokens = {
        "spacing.small": "8px",
        "spacing.medium": "{spacing.small} * 2"
      };

      const result1 = interpretTokens(tokens);
      const result2 = processTokensFromJson(tokens);

      expect(result1).toEqual(result2);
    });
  });

  describe('processSingleTokenSet (backward compatibility)', () => {
    it('should process single token sets', () => {
      const tokens = {
        "spacing.small": "8px",
        "spacing.medium": "{spacing.small} * 2",
        "color.primary": "#0066cc"
      };

      const result = processSingleTokenSet(tokens);

      expect(result["spacing.small"]).toBe("8px");
      expect(result["spacing.medium"]).toBe("16px");
      expect(result["color.primary"]).toBe("#0066cc");
    });
  });

  describe('Edge cases', () => {
    it('should handle circular references gracefully', () => {
      const circularTokens = {
        "token.a": "{token.b}",
        "token.b": "{token.a}"
      };

      // Should not throw, but may not resolve the circular references
      const result = interpretTokens(circularTokens);
      expect(result).toBeDefined();
    });

    it('should handle missing references', () => {
      const tokensWithMissingRef = {
        "spacing.small": "8px",
        "spacing.medium": "{spacing.nonexistent} * 2"
      };

      // Should not throw, but may not resolve the missing reference
      const result = interpretTokens(tokensWithMissingRef);
      expect(result["spacing.small"]).toBe("8px");
      // spacing.medium might remain unresolved or fallback to original value
    });

    it('should handle nested DTCG structures', () => {
      const nestedTokens = {
        "design": {
          "spacing": {
            "scale": {
              "small": {
                "$type": "dimension",
                "$value": "8px"
              },
              "medium": {
                "$type": "dimension", 
                "$value": "{design.spacing.scale.small} * 2"
              }
            }
          }
        }
      };

      const result = interpretTokens(nestedTokens);
      expect(result["design.spacing.scale.small"]).toBe("8px");
      expect(result["design.spacing.scale.medium"]).toBe("16px");
    });
  });
});
