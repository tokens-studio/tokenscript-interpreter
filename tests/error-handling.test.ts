import { describe, expect, it } from "vitest";
import { interpretTokensWithMetadata } from "../tokenset-processor";

describe("Error Handling in DTCG Output", () => {
  it("should include $error property for failed token resolution", () => {
    const testTokens = {
      "color.primary": {
        "$type": "color",
        "$value": "rgb({color.base.red}, {color.base.green}, {color.base.blue})",
        "$description": "Primary color using RGB composition"
      },
      "color.base.red": {
        "$type": "number", 
        "$value": "255"
      },
      "color.base.green": {
        "$type": "number",
        "$value": "128"
      },
      // Missing color.base.blue - this should cause an error
      "color.secondary": {
        "$type": "color",
        "$value": "hsl({color.hue}, 50%, 50%)",
        "$description": "Secondary color using HSL"
      },
      // Missing color.hue - this should also cause an error
      "color.valid": {
        "$type": "color", 
        "$value": "#ff0000",
        "$description": "A valid color that should resolve successfully"
      }
    };

    const result = interpretTokensWithMetadata(testTokens);

    // Check successful resolution (no $error property)
    expect(result["color.valid"].$value).toBe("#ff0000");
    expect(result["color.valid"]).not.toHaveProperty("$error");

    // Check simple tokens that should resolve
    expect(result["color.base.red"].$value).toBe("255");
    expect(result["color.base.red"]).not.toHaveProperty("$error");
    expect(result["color.base.green"].$value).toBe("128");
    expect(result["color.base.green"]).not.toHaveProperty("$error");

    // Check failed resolutions (have $error property)
    expect(result["color.primary"]).toHaveProperty("$error");
    expect(result["color.primary"].$error).toHaveProperty("tokenName", "color.primary");
    expect(result["color.primary"].$error).toHaveProperty("errorType", "circular_dependency");
    expect(result["color.primary"].$error).toHaveProperty("originalValue");
    expect(result["color.primary"].$error).toHaveProperty("details");

    expect(result["color.secondary"]).toHaveProperty("$error");
    expect(result["color.secondary"].$error).toHaveProperty("tokenName", "color.secondary");
    expect(result["color.secondary"].$error).toHaveProperty("errorType", "circular_dependency");
    expect(result["color.secondary"].$error).toHaveProperty("originalValue");
    expect(result["color.secondary"].$error).toHaveProperty("details");
  });

  it("should preserve original metadata while adding structured error information", () => {
    const testTokens = {
      "spacing.invalid": {
        "$type": "dimension",
        "$value": "{spacing.base} * {spacing.multiplier}",
        "$description": "Invalid spacing calculation",
        "$extensions": {
          "custom": "metadata"
        }
      }
      // Missing spacing.base and spacing.multiplier
    };

    const result = interpretTokensWithMetadata(testTokens);
    const token = result["spacing.invalid"];

    // Should preserve original metadata
    expect(token.$type).toBe("dimension");
    expect(token.$description).toBe("Invalid spacing calculation");
    expect(token.$extensions).toEqual({ custom: "metadata" });

    // Should add structured error information
    expect(token).toHaveProperty("$error");
    expect(token.$error).toHaveProperty("tokenName", "spacing.invalid");
    expect(token.$error).toHaveProperty("errorType", "circular_dependency");
    expect(token.$error).toHaveProperty("originalValue");
    expect(token.$error).toHaveProperty("details");

    // Should preserve original $value as fallback
    expect(token.$value).toBe("{spacing.base} * {spacing.multiplier}");
  });

  it("should handle themed tokens with error information", () => {
    const testTokens = {
      "$themes": [
        {
          "name": "light",
          "selectedTokenSets": [
            { "id": "core", "status": "enabled" },
            { "id": "light-theme", "status": "enabled" }
          ]
        }
      ],
      "core": {
        "color": {
          "base": {
            "$type": "color",
            "$value": "#000000"
          }
        }
      },
      "light-theme": {
        "color": {
          "primary": {
            "$type": "color",
            "$value": "lighten({color.base}, {color.lightness})",
            "$description": "Primary color for light theme"
          }
        }
        // Missing color.lightness
      }
    };

    const result = interpretTokensWithMetadata(testTokens);
    const lightTheme = result.light;

    // Check that base color resolves successfully (no $error property)
    expect(lightTheme["core.color.base"].$value).toBe("#000000");
    expect(lightTheme["core.color.base"]).not.toHaveProperty("$error");

    // Check that primary color fails with structured error information
    expect(lightTheme["light-theme.color.primary"]).toHaveProperty("$error");
    expect(lightTheme["light-theme.color.primary"].$error).toHaveProperty("tokenName", "color.primary");
    expect(lightTheme["light-theme.color.primary"].$error).toHaveProperty("errorType", "circular_dependency");
    expect(lightTheme["light-theme.color.primary"].$error).toHaveProperty("originalValue");
    expect(lightTheme["light-theme.color.primary"].$error).toHaveProperty("details");
    expect(lightTheme["light-theme.color.primary"].$description).toBe("Primary color for light theme");
  });
});
