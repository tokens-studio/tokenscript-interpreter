import { Config } from "@src/interpreter/config/config";
import { buildTokens } from "@src/lib/processor";
import { describe, expect, it } from "vitest";

/**
 * Test suite to verify that Config and managers work correctly when used
 * with the processor functionality.
 *
 * Issue: When Config was only exported from main entry but used internally by /processor,
 * users who imported from both entry points would get different class instances,
 * leading to incomplete initialization (e.g., ColorManager missing initializers).
 */
describe("Processor entry point - Config and Managers", () => {
  it("should create Config with default ColorManager that has hex initializer", () => {
    const config = new Config();

    // Default ColorManager should have at least the hex initializer
    expect(config.colorManager.hasInitializer("hex")).toBe(true);
  });

  it("should allow registering color schemas and using buildTokens", () => {
    // Create a simple RGB color specification
    const rgbSpec = {
      name: "RGB",
      type: "color" as const,
      description: "RGB color",
      schema: {
        type: "object" as const,
        properties: {
          r: { type: "number" as const },
          g: { type: "number" as const },
          b: { type: "number" as const },
        },
        required: ["r", "g", "b"],
        order: ["r", "g", "b"],
        additionalProperties: false,
      },
      initializers: [
        {
          title: "RGB Initializer",
          keyword: "rgb",
          description: "Creates a RGB color",
          schema: {
            type: "string" as const,
            pattern: "^rgb\\((\\d{1,3}),\\s*(\\d{1,3}),\\s*(\\d{1,3})\\)$",
          },
          script: {
            type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
            script:
              "variable color_parts: List = {input}; \n variable output: Color.RGB;\n output.r = color_parts.get(0);\n output.g = color_parts.get(1);\n output.b = color_parts.get(2);\n return output;",
          },
        },
      ],
      conversions: [],
    };

    const config = new Config();
    config.registerSchemas([
      {
        uri: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/",
        schema: rgbSpec,
      },
    ]);

    // Verify rgb initializer is registered
    expect(config.colorManager.hasInitializer("rgb")).toBe(true);

    // Test that buildTokens can use the registered schema
    const tokens = new Map([["test.color", { $value: "rgb(255, 0, 0)", $type: "color" }]]);

    const result = buildTokens(tokens, { config });

    // Verify no issues occurred
    expect(result.issues?.size || 0).toBe(0);

    // Check the resolved token
    const resolvedToken = result.tokens.get("test.color");
    expect(resolvedToken).toBeDefined();
    expect(resolvedToken?.type).toBe("Color");
  });
});
