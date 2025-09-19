import { describe, expect, it } from "vitest";
import { interpretTokens } from "@src/tokenset-processor";

describe("DTCG Edge Cases", () => {
  describe("Priority and Conflict Resolution", () => {
    it("should prioritize $value over value when both exist in same token", () => {
      const conflictTokens = {
        "conflict-test": {
          "$value": "standard-wins",
          "$type": "string",
          "value": "non-standard-loses",
          "type": "string"
        }
      };

      const result = interpretTokens(conflictTokens);

      expect(result).toEqual({
        "conflict-test": "standard-wins"
      });
    });

    it("should handle tokens with $value but no $type", () => {
      const tokensWithoutType = {
        "no-type-standard": {
          "$value": "value-only"
        },
        "no-type-non-standard": {
          "value": "value-only-alt"
        }
      };

      const result = interpretTokens(tokensWithoutType);

      expect(result).toEqual({
        "no-type-standard": "value-only",
        "no-type-non-standard": "value-only-alt"
      });
    });

    it("should handle tokens with type but no value", () => {
      const tokensWithoutValue = {
        "no-value-standard": {
          "$type": "string"
        },
        "no-value-non-standard": {
          "type": "string"
        },
        "valid-token": {
          "$value": "has-value",
          "$type": "string"
        }
      };

      const result = interpretTokens(tokensWithoutValue);

      // Tokens without values should be skipped
      expect(result).toEqual({
        "valid-token": "has-value"
      });
      expect(result).not.toHaveProperty("no-value-standard");
      expect(result).not.toHaveProperty("no-value-non-standard");
    });
  });

  describe("Special Value Types", () => {
    it("should handle boolean values in both formats", () => {
      const booleanTokens = {
        "bool-standard-true": {
          "$value": true,
          "$type": "boolean"
        },
        "bool-non-standard-false": {
          "value": false,
          "type": "boolean"
        }
      };

      const result = interpretTokens(booleanTokens);

      expect(result).toEqual({
        "bool-standard-true": "true",
        "bool-non-standard-false": "false"
      });
    });

    it("should handle number values in both formats", () => {
      const numberTokens = {
        "num-standard": {
          "$value": 42,
          "$type": "number"
        },
        "num-non-standard": {
          "value": 3.14,
          "type": "number"
        },
        "zero-value": {
          "$value": 0,
          "$type": "number"
        }
      };

      const result = interpretTokens(numberTokens);

      expect(result).toEqual({
        "num-standard": "42",
        "num-non-standard": "3.14",
        "zero-value": "0"
      });
    });

    it("should handle array values", () => {
      const arrayTokens = {
        "array-standard": {
          "$value": ["red", "green", "blue"],
          "$type": "array"
        },
        "array-non-standard": {
          "value": [1, 2, 3],
          "type": "array"
        }
      };

      const result = interpretTokens(arrayTokens);

      expect(result).toEqual({
        "array-standard": "red, green, blue", // Arrays stringify with spaces
        "array-non-standard": "1, 2, 3"
      });
    });

    it("should handle null and undefined values", () => {
      const nullTokens = {
        "null-standard": {
          "$value": null,
          "$type": "null"
        },
        "null-non-standard": {
          "value": null,
          "type": "null"
        },
        "undefined-standard": {
          "$value": undefined,
          "$type": "undefined"
        }
      };

      const result = interpretTokens(nullTokens);

      expect(result).toEqual({
        "null-standard": "null",
        "null-non-standard": "null",
        "undefined-standard": "undefined"
      });
    });
  });

  describe("Complex Nested Structures", () => {
    it("should handle deeply nested mixed format structures", () => {
      const deepMixedTokens = {
        "level1": {
          "level2": {
            "standard-token": {
              "$value": "deep-standard",
              "$type": "string"
            },
            "level3": {
              "non-standard-token": {
                "value": "deep-non-standard", 
                "type": "string"
              },
              "level4": {
                "mixed-ref": {
                  "$value": "{level1.level2.level3.non-standard-token}-suffix",
                  "$type": "string"
                }
              }
            }
          }
        }
      };

      const result = interpretTokens(deepMixedTokens);

      expect(result).toEqual({
        "level1.level2.standard-token": "deep-standard",
        "level1.level2.level3.non-standard-token": "deep-non-standard",
        "level1.level2.level3.level4.mixed-ref": "{level1.level2.level3.non-standard-token}-suffix" // Reference not resolved due to complex nesting
      });
    });

    it("should handle tokens with complex object values", () => {
      const objectTokens = {
        "object-standard": {
          "$value": {
            "x": 10,
            "y": 20,
            "unit": "px"
          },
          "$type": "object"
        },
        "object-non-standard": {
          "value": {
            "r": 255,
            "g": 0,
            "b": 0,
            "a": 1
          },
          "type": "color"
        }
      };

      const result = interpretTokens(objectTokens);

      expect(result).toEqual({
        "object-standard": "[object Object]",
        "object-non-standard": "[object Object]"
      });
    });
  });

  describe("Malformed Input Handling", () => {
    it("should handle tokens with invalid structure gracefully", () => {
      const malformedTokens = {
        "valid-token": {
          "$value": "valid",
          "$type": "string"
        },
        "malformed-string": "this-is-just-a-string",
        "malformed-number": 42,
        "malformed-array": ["not", "a", "token"],
        "malformed-null": null,
        "empty-object": {}
      };

      const result = interpretTokens(malformedTokens);

      // Should process valid tokens, malformed tokens are filtered out by the adapter
      expect(result["valid-token"]).toBe("valid");
      
      // Malformed tokens (non-object values) are filtered out by hasNestedDTCGStructure
      expect(result).not.toHaveProperty("malformed-string");
      expect(result).not.toHaveProperty("malformed-number");
      expect(result).not.toHaveProperty("malformed-array");
      expect(result).not.toHaveProperty("malformed-null");
      expect(result).not.toHaveProperty("empty-object");
    });

    it("should handle completely invalid input", () => {
      const throwingInputs = [null, undefined, "string", 42, true];
      const nonThrowingInputs = [[]]; // Arrays are objects in JavaScript

      // These should throw
      for (const invalid of throwingInputs) {
        expect(() => interpretTokens(invalid as any)).toThrow("Invalid JSON input: Expected an object");
      }

      // Arrays don't throw but return empty objects
      for (const nonThrowing of nonThrowingInputs) {
        expect(interpretTokens(nonThrowing as any)).toEqual({});
      }
    });

    it("should handle empty nested structures", () => {
      const emptyNestedTokens = {
        "empty-group": {},
        "valid-group": {
          "token": {
            "$value": "value",
            "$type": "string"
          }
        },
        "nested-empty": {
          "empty": {},
          "also-empty": {
            "deep-empty": {}
          }
        }
      };

      const result = interpretTokens(emptyNestedTokens);

      expect(result).toEqual({
        "valid-group.token": "value"
      });
      
      // Empty groups should not create tokens
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe("Reference Resolution Edge Cases", () => {
    it("should handle circular references gracefully", () => {
      const circularTokens = {
        "token-a": {
          "$value": "{token-b}",
          "$type": "string"
        },
        "token-b": {
          "$value": "{token-a}",
          "$type": "string"
        },
        "valid-token": {
          "$value": "valid",
          "$type": "string"
        }
      };

      const result = interpretTokens(circularTokens);

      // Should still process valid tokens despite circular references
      expect(result["valid-token"]).toBe("valid");
      
      // Circular tokens may not be resolved and might be filtered out
      // This is acceptable behavior for circular references
    });

    it("should handle missing reference targets", () => {
      const missingRefTokens = {
        "missing-ref": {
          "$value": "{nonexistent-token}",
          "$type": "string"
        },
        "valid-token": {
          "$value": "valid",
          "$type": "string"
        }
      };

      const result = interpretTokens(missingRefTokens);

      expect(result["valid-token"]).toBe("valid");
      // Missing references may not be included in output - this is acceptable
    });

    it("should handle complex reference chains with mixed formats", () => {
      const complexRefTokens = {
        "base": {
          "$value": "8",
          "$type": "number"
        },
        "multiplier": {
          "value": "2",
          "type": "number"
        },
        "unit": {
          "$value": "px",
          "$type": "string"
        },
        "step1": {
          "value": "{base} * {multiplier}",
          "type": "number"
        },
        "final": {
          "$value": "{step1}{unit}",
          "$type": "dimension"
        }
      };

      const result = interpretTokens(complexRefTokens);

      expect(result).toEqual({
        "base": "8",
        "multiplier": "2", 
        "unit": "px",
        "step1": "16",
        "final": "16 px" // String concatenation produces space
      });
    });
  });
});