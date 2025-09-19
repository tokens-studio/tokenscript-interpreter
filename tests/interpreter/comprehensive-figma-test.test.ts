import { describe, it as test, expect } from "vitest";
import {
  interpretTokensAsObjects,
  createFigmaColorTransformForObjects,
} from "../../src/lib/index";

describe("Comprehensive Figma Plugin Integration Test", () => {
  test("should process complex folder structure with $extensions and output Figma-ready transformedValues", () => {
    // Complex realistic design system structure like you'd find in a Figma plugin
    const complexDesignSystem = {
      // Core foundation tokens
      "foundation": {
        "colors": {
          "brand": {
            "primary": {
              "$value": "#3b82f6",
              "$type": "color",
              "$description": "Primary brand color",
              "$extensions": {
                "figma": {
                  "scopes": ["ALL_SCOPES"],
                  "hiddenFromPublishing": false
                },
                "tokens-studio": {
                  "category": "brand"
                }
              }
            },
            "secondary": {
              "$value": "#64748b",
              "$type": "color", 
              "$description": "Secondary brand color",
              "$extensions": {
                "figma": {
                  "scopes": ["FILL_COLOR", "STROKE_COLOR"],
                  "hiddenFromPublishing": false
                }
              }
            }
          },
          "semantic": {
            "success": {
              "$value": "#10b981",
              "$type": "color",
              "$extensions": {
                "figma": {
                  "scopes": ["ALL_SCOPES"],
                  "codeSyntax": "success"
                }
              }
            },
            "warning": {
              "$value": "#f59e0b", 
              "$type": "color",
              "$extensions": {
                "figma": {
                  "scopes": ["ALL_SCOPES"],
                  "codeSyntax": "warning"
                }
              }
            },
            "error": {
              "$value": "#ef4444",
              "$type": "color",
              "$extensions": {
                "figma": {
                  "scopes": ["ALL_SCOPES"],
                  "codeSyntax": "error"
                }
              }
            }
          }
        },
        "spacing": {
          "xs": {
            "$value": "4px",
            "$type": "dimension",
            "$description": "Extra small spacing",
            "$extensions": {
              "figma": {
                "scopes": ["GAP"],
                "hiddenFromPublishing": false
              }
            }
          },
          "sm": {
            "$value": "8px",
            "$type": "dimension",
            "$extensions": {
              "figma": {
                "scopes": ["GAP", "CORNER_RADIUS"]
              }
            }
          },
          "md": {
            "$value": "16px",
            "$type": "dimension",
            "$extensions": {
              "figma": {
                "scopes": ["GAP", "CORNER_RADIUS"],
                "codeSyntax": "medium"
              }
            }
          }
        }
      },

      // Component-specific tokens that reference foundation
      "components": {
        "button": {
          "primary": {
            "background": {
              "$value": "{foundation.colors.brand.primary}",
              "$type": "color",
              "$description": "Primary button background color",
              "$extensions": {
                "figma": {
                  "scopes": ["FILL_COLOR"],
                  "component": "Button",
                  "property": "background"
                }
              }
            },
            "text": {
              "$value": "#ffffff",
              "$type": "color",
              "$description": "Primary button text color", 
              "$extensions": {
                "figma": {
                  "scopes": ["TEXT_FILL"],
                  "component": "Button",
                  "property": "text"
                }
              }
            },
            "padding": {
              "$value": "{foundation.spacing.sm} {foundation.spacing.md}",
              "$type": "spacing",
              "$extensions": {
                "figma": {
                  "scopes": ["GAP"],
                  "component": "Button"
                }
              }
            }
          },
          "secondary": {
            "background": {
              "$value": "transparent",
              "$type": "color",
              "$extensions": {
                "figma": {
                  "scopes": ["FILL_COLOR"],
                  "component": "Button"
                }
              }
            },
            "border": {
              "$value": "{foundation.colors.brand.secondary}",
              "$type": "color",
              "$extensions": {
                "figma": {
                  "scopes": ["STROKE_COLOR"],
                  "component": "Button"
                }
              }
            }
          }
        },
        "card": {
          "background": {
            "$value": "#ffffff",
            "$type": "color",
            "$extensions": {
              "figma": {
                "scopes": ["FILL_COLOR"],
                "component": "Card",
                "property": "background"
              }
            }
          },
          "border": {
            "$value": "#e5e7eb",
            "$type": "color",
            "$extensions": {
              "figma": {
                "scopes": ["STROKE_COLOR"],
                "component": "Card"
              }
            }
          },
          "radius": {
            "$value": "{foundation.spacing.sm}",
            "$type": "dimension",
            "$extensions": {
              "figma": {
                "scopes": ["CORNER_RADIUS"],
                "component": "Card"
              }
            }
          }
        }
      }
    };

    // Apply Figma color transform
    const figmaTransform = createFigmaColorTransformForObjects();
    const result = interpretTokensAsObjects(complexDesignSystem, {
      transforms: [figmaTransform],
      enableThemes: false // Test flat structure first
    });

    // ✅ 1. Foundation colors should have both original and Figma-ready values
    const primaryBrand = result.tokens["foundation.colors.brand.primary"];
    expect(primaryBrand).toEqual({
      value: "#3b82f6",                    // ✅ Original hex preserved
      transformedValue: {                  // ✅ Figma RGB values added
        r: expect.closeTo(0.231, 2),
        g: expect.closeTo(0.510, 2),
        b: expect.closeTo(0.965, 2),
        a: 1
      },
      $type: "color",
      $description: "Primary brand color",
      $extensions: {                       // ✅ All $extensions preserved
        figma: {
          scopes: ["ALL_SCOPES"],
          hiddenFromPublishing: false
        },
        "tokens-studio": {
          category: "brand"
        }
      }
    });

    // ✅ 2. Semantic colors with different Figma extensions
    const successColor = result.tokens["foundation.colors.semantic.success"];
    expect(successColor.value).toBe("#10b981");
    expect(successColor.transformedValue).toEqual({
      r: expect.closeTo(0.063, 2),
      g: expect.closeTo(0.725, 2), 
      b: expect.closeTo(0.506, 2),
      a: 1
    });
    expect(successColor.$extensions.figma.codeSyntax).toBe("success");

    const errorColor = result.tokens["foundation.colors.semantic.error"];
    expect(errorColor.value).toBe("#ef4444");
    expect(errorColor.transformedValue).toEqual({
      r: expect.closeTo(0.937, 2),
      g: expect.closeTo(0.267, 2),
      b: expect.closeTo(0.267, 2),
      a: 1
    });
    expect(errorColor.$extensions.figma.codeSyntax).toBe("error");

    // ✅ 3. Non-color tokens should preserve original values but no transformedValue
    const spacingMd = result.tokens["foundation.spacing.md"];
    expect(spacingMd).toEqual({
      value: "16px",
      $type: "dimension",
      $extensions: {
        figma: {
          scopes: ["GAP", "CORNER_RADIUS"],
          codeSyntax: "medium"
        }
      }
      // ✅ No transformedValue for non-color tokens
    });

    // ✅ 4. Component tokens that reference foundation tokens should resolve
    const buttonBackground = result.tokens["components.button.primary.background"];
    expect(buttonBackground.value).toBe("#3b82f6");  // ✅ Resolved from reference
    expect(buttonBackground.transformedValue).toEqual({
      r: expect.closeTo(0.231, 2),
      g: expect.closeTo(0.510, 2),
      b: expect.closeTo(0.965, 2),
      a: 1
    });
    expect(buttonBackground.$extensions.figma.component).toBe("Button");
    expect(buttonBackground.$extensions.figma.property).toBe("background");

    // ✅ 5. Component tokens with component-specific extensions
    const buttonText = result.tokens["components.button.primary.text"];
    expect(buttonText.value).toBe("#ffffff");
    expect(buttonText.transformedValue).toEqual({
      r: 1, g: 1, b: 1, a: 1
    });
    expect(buttonText.$extensions.figma.scopes).toEqual(["TEXT_FILL"]);

    // ✅ 6. Non-color component tokens should preserve references but not transform
    const buttonPadding = result.tokens["components.button.primary.padding"];
    expect(buttonPadding.value).toBe("8px 16px");  // ✅ Multi-value resolved
    expect(buttonPadding.transformedValue).toBeUndefined(); // ✅ No transform for spacing
    expect(buttonPadding.$extensions.figma.component).toBe("Button");

    // ✅ 7. Border colors with specific stroke scopes
    const secondaryBorder = result.tokens["components.button.secondary.border"];
    expect(secondaryBorder.value).toBe("#64748b");  // ✅ Resolved from reference
    expect(secondaryBorder.transformedValue).toEqual({
      r: expect.closeTo(0.392, 2),
      g: expect.closeTo(0.455, 2),
      b: expect.closeTo(0.545, 2),
      a: 1
    });
    expect(secondaryBorder.$extensions.figma.scopes).toEqual(["STROKE_COLOR"]);

    // ✅ 8. Transparent colors should handle properly
    const transparentBg = result.tokens["components.button.secondary.background"];
    expect(transparentBg.value).toBe("transparent");
    // Note: transparent colors might not have transformedValue or might need special handling

    // ✅ 9. Card components with dimension references
    const cardRadius = result.tokens["components.card.radius"];
    expect(cardRadius.value).toBe("8px");  // ✅ Resolved from foundation.spacing.sm
    expect(cardRadius.transformedValue).toBeUndefined(); // ✅ No transform for dimensions
    expect(cardRadius.$extensions.figma.scopes).toEqual(["CORNER_RADIUS"]);

    // ✅ 10. Verify all tokens have correct structure
    for (const [tokenName, tokenObject] of Object.entries(result.tokens)) {
      // Every token should have a value
      expect(tokenObject.value).toBeDefined();
      
      // Color tokens should have transformedValue, others should not
      if (tokenObject.$type === "color" && tokenObject.value !== "transparent") {
        expect(tokenObject.transformedValue).toBeDefined();
        expect(tokenObject.transformedValue).toHaveProperty("r");
        expect(tokenObject.transformedValue).toHaveProperty("g");
        expect(tokenObject.transformedValue).toHaveProperty("b");
        expect(tokenObject.transformedValue).toHaveProperty("a");
      } else if (tokenObject.$type !== "color") {
        expect(tokenObject.transformedValue).toBeUndefined();
      }
      
      // All tokens with $extensions should preserve them
      if (tokenObject.$extensions) {
        expect(tokenObject.$extensions.figma).toBeDefined();
        expect(Array.isArray(tokenObject.$extensions.figma.scopes)).toBe(true);
      }
    }

    // ✅ 11. Verify we have all expected tokens (16 total)
    const expectedTokenCount = 16; 
    expect(Object.keys(result.tokens).length).toBe(expectedTokenCount);
    
    console.log("✅ SUCCESS: Complex design system processed with Figma transforms!");
    console.log(`📊 Processed ${Object.keys(result.tokens).length} tokens`);
    console.log(`🎨 Color tokens with Figma transforms: ${Object.values(result.tokens).filter(t => t.transformedValue).length}`);
  });
});