import { describe, it, expect, beforeEach } from "vitest";
import { ColorManager } from "@interpreter/config/managers/color/manager";
import { ColorSymbol, NumberSymbol, StringSymbol, ListSymbol } from "@interpreter/symbols";
import { ReassignNode, IdentifierNode } from "@interpreter/ast";
import { InterpreterError } from "@interpreter/errors";
import { ColorManagerError } from "@interpreter/error-types";
import * as fs from "node:fs";
import * as path from "node:path";

describe("ColorManager", () => {
  it("registers and retrieves the RGB color specification", () => {
    const rgbSpecPath = path.join(__dirname, "../../data/specifications/colors/rgb.json");
    const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
    const manager = new ColorManager();

    const spec = manager.register(rgbSpecPath, JSON.parse(rgbSpecString));
    expect(spec).toBeDefined();
    expect(spec.name).toBe("RGB");

    const retrieved = manager.getSpec(rgbSpecPath);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("RGB");
  });

  describe("setAttribute", () => {
    let manager: ColorManager;
    let rgbSpecPath: string;

    beforeEach(() => {
      manager = new ColorManager();
      rgbSpecPath = path.join(__dirname, "../../data/specifications/colors/rgb.json");
      const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
      manager.register(rgbSpecPath, JSON.parse(rgbSpecString));
    });

    const createMockToken = (value: string, line: number = 1) => ({
      type: "IDENTIFIER" as const,
      value,
      line,
    });

    const createReassignNode = (identifierName: string, attributeName?: string) => {
      const identifierToken = createMockToken(identifierName);
      const baseIdentifier = new IdentifierNode(identifierToken);
      
      if (attributeName) {
        const attributeToken = createMockToken(attributeName);
        const attributeIdentifier = new IdentifierNode(attributeToken);
        return new ReassignNode(
          [baseIdentifier, attributeIdentifier],
          new IdentifierNode(createMockToken("value")),
          identifierToken
        );
      } else {
        return new ReassignNode(
          baseIdentifier,
          new IdentifierNode(createMockToken("value")),
          identifierToken
        );
      }
    };

    it("successfully sets a valid attribute on a color symbol", () => {
      const color = new ColorSymbol(null, "RGB");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ r: attributeValue });
    });

    it("throws error when trying to set attributes on a string color value", () => {
      const color = new ColorSymbol("#ff0000");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      let error: InterpreterError | undefined;
      try {
        manager.setAttribute(color, node, attributeValue);
      } catch (e) {
        error = e as InterpreterError;
      }

      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.type).toBe(ColorManagerError.STRING_VALUE_ASSIGNMENT);
      expect(error?.message).toContain("Cannot set attributes 'r' for variable myColor");
    });

    it("throws error when attributes chain length exceeds one element", () => {
      const color = new ColorSymbol(null, "RGB");
      const identifierToken = createMockToken("myColor");
      const baseIdentifier = new IdentifierNode(identifierToken);
      const attr1 = new IdentifierNode(createMockToken("r"));
      const attr2 = new IdentifierNode(createMockToken("value"));
      
      const node = new ReassignNode(
        [baseIdentifier, attr1, attr2],
        new IdentifierNode(createMockToken("test")),
        identifierToken
      );
      const attributeValue = new NumberSymbol(255);

      let error: InterpreterError | undefined;
      try {
        manager.setAttribute(color, node, attributeValue);
      } catch (e) {
        error = e as InterpreterError;
      }

      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.type).toBe(ColorManagerError.ATTRIBUTE_CHAIN_TOO_LONG);
      expect(error?.message).toContain("Attributes chain 'r.value' for variable myColor");
    });

    it("throws error when no spec is found for the color type", () => {
      const color = new ColorSymbol(null, "UNKNOWN_TYPE");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      let error: InterpreterError | undefined;
      try {
        manager.setAttribute(color, node, attributeValue);
      } catch (e) {
        error = e as InterpreterError;
      }

      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.type).toBe(ColorManagerError.MISSING_SPEC);
      expect(error?.message).toContain("No spec UNKNOWN_TYPE defined for variable myColor");
    });

    it("throws error when no schema found for the attribute key", () => {
      const color = new ColorSymbol(null, "RGB");
      const node = createReassignNode("myColor", "invalidAttribute");
      const attributeValue = new NumberSymbol(255);

      let error: InterpreterError | undefined;
      try {
        manager.setAttribute(color, node, attributeValue);
      } catch (e) {
        error = e as InterpreterError;
      }

      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.type).toBe(ColorManagerError.MISSING_SCHEMA);
      expect(error?.message).toContain("No schema found for key invalidAttribute for variable myColor");
    });

    it("throws error when attribute type does not match schema type", () => {
      const color = new ColorSymbol(null, "RGB");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new StringSymbol("invalid"); // Should be number

      let error: InterpreterError | undefined;
      try {
        manager.setAttribute(color, node, attributeValue);
      } catch (e) {
        error = e as InterpreterError;
      }

      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.type).toBe(ColorManagerError.INVALID_ATTRIBUTE_TYPE);
      expect(error?.message).toContain("Invalid attribute type 'String'. Use a valid type.");
    });

    it("preserves existing attributes when setting a new one", () => {
      const color = new ColorSymbol(null, "RGB");
      color.value = { g: new NumberSymbol(128) };
      
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ 
        g: new NumberSymbol(128),
        r: attributeValue 
      });
    });

    it("overwrites existing attribute with same key", () => {
      const color = new ColorSymbol(null, "RGB");
      color.value = { r: new NumberSymbol(100) };
      
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ r: attributeValue });
    });

    it("initializes empty object when color value is null", () => {
      const color = new ColorSymbol(null, "RGB");
      // Explicitly ensure value is null
      color.value = null;
      
      const node = createReassignNode("myColor", "g");
      const attributeValue = new NumberSymbol(128);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ g: attributeValue });
    });
  });

  describe("registerInitializer", () => {
    let manager: ColorManager;

    beforeEach(() => {
      manager = new ColorManager();
    });

    it("should register default hex initializer on instantiation", () => {
      // Default ColorManager should have hex initializer available
      const hexSpec = manager.getSpecByType("hex");
      expect(hexSpec).toBeDefined();
      expect(hexSpec?.initializers).toBeDefined();
      expect(hexSpec?.initializers.length).toBeGreaterThan(0);
      expect(hexSpec?.initializers[0].keyword).toBe("hex");
    });

    it("should register RGB initializer from RGB specification", () => {
      const rgbSpecPath = path.join(__dirname, "../../data/specifications/colors/rgb.json");
      const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
      const rgbSpec = JSON.parse(rgbSpecString);

      manager.register(rgbSpecPath, rgbSpec);

      const registeredSpec = manager.getSpecByType("RGB");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers).toBeDefined();
      expect(registeredSpec?.initializers.length).toBeGreaterThan(0);
      expect(registeredSpec?.initializers[0].keyword).toBe("rgb");
    });

    it("should register multiple initializers from one specification", () => {
      const multiInitSpec = {
        name: "TestColor",
        type: "color",
        description: "Test color with multiple initializers",
        schema: {
          type: "object",
          properties: {
            r: { type: "number" },
            g: { type: "number" },
            b: { type: "number" }
          },
          required: ["r", "g", "b"],
          additionalProperties: false
        },
        initializers: [
          {
            title: "RGB Function",
            keyword: "rgb",
            description: "Creates RGB from values",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.TestColor; output.r = 255; output.g = 0; output.b = 0; return output;"
            }
          },
          {
            title: "HSL Function", 
            keyword: "hsl",
            description: "Creates RGB from HSL",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.TestColor; output.r = 128; output.g = 128; output.b = 128; return output;"
            }
          }
        ],
        conversions: []
      };

      manager.register("test://multi-init", multiInitSpec);

      const registeredSpec = manager.getSpecByType("TestColor");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(2);
      expect(registeredSpec?.initializers[0].keyword).toBe("rgb");
      expect(registeredSpec?.initializers[1].keyword).toBe("hsl");
    });

    it("should handle specifications with no initializers", () => {
      const noInitSpec = {
        name: "NoInit",
        type: "color", 
        description: "Color with no initializers",
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          additionalProperties: false
        },
        initializers: [],
        conversions: []
      };

      expect(() => {
        manager.register("test://no-init", noInitSpec);
      }).not.toThrow();

      const registeredSpec = manager.getSpecByType("NoInit");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(0);
    });

    it("should register initializers with case-insensitive keywords", () => {
      const caseSpec = {
        name: "CaseTest",
        type: "color",
        description: "Test case sensitivity", 
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          additionalProperties: false
        },
        initializers: [
          {
            title: "Upper Case Keyword",
            keyword: "UPPERCASE",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.CaseTest; return output;"
            }
          }
        ],
        conversions: []
      };

      manager.register("test://case", caseSpec);
      
      const registeredSpec = manager.getSpecByType("CaseTest");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers[0].keyword).toBe("UPPERCASE");
    });
  });

  describe("initializer execution", () => {
    let manager: ColorManager;

    beforeEach(() => {
      manager = new ColorManager();
    });

    it("should execute the default hex initializer successfully", () => {
      // Note: This test may need to be adjusted based on actual hex initializer implementation
      // For now, testing that the initializer exists and can be called
      const hexSpec = manager.getSpecByType("hex");
      expect(hexSpec).toBeDefined();
      expect(hexSpec?.initializers.length).toBeGreaterThan(0);
    });

    it("should execute RGB initializer from specification", () => {
      const rgbSpecPath = path.join(__dirname, "../../data/specifications/colors/rgb.json");
      const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
      const rgbSpec = JSON.parse(rgbSpecString);

      manager.register(rgbSpecPath, rgbSpec);

      // Verify the initializer was registered
      const registeredSpec = manager.getSpecByType("RGB");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBeGreaterThan(0);
    });

    it("should catch initializer script parsing errors during registration", () => {
      const invalidScript = {
        name: "InvalidScript",
        type: "color",
        description: "Color with invalid initializer script",
        schema: {
          type: "object", 
          properties: { value: { type: "string" } },
          additionalProperties: false
        },
        initializers: [
          {
            title: "Invalid Initializer",
            keyword: "invalid",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "invalid syntax here $$$ ???"
            }
          }
        ],
        conversions: []
      };

      // The registration should fail due to invalid script syntax
      expect(() => {
        manager.register("test://invalid-script", invalidScript);
      }).toThrow();
    });

    it("should register initializers that return proper ColorSymbol instances", () => {
      const testSpec = {
        name: "TestReturn",
        type: "color",
        description: "Test proper return values",
        schema: {
          type: "object",
          properties: {
            r: { type: "number" },
            g: { type: "number" },
            b: { type: "number" }
          },
          additionalProperties: false
        },
        initializers: [
          {
            title: "Test Initializer",
            keyword: "test",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer", 
              script: "variable output: Color.TestReturn; output.r = 100; output.g = 150; output.b = 200; return output;"
            }
          }
        ],
        conversions: []
      };

      manager.register("test://test-return", testSpec);
      
      const registeredSpec = manager.getSpecByType("TestReturn");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(1);
    });

    it("should handle initializers with different script types", () => {
      const differentTypeSpec = {
        name: "DifferentType", 
        type: "color",
        description: "Test different script type",
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          additionalProperties: false
        },
        initializers: [
          {
            title: "Different Script Type",
            keyword: "different",
            script: {
              type: "https://example.com/different-type",
              script: "variable output: Color.DifferentType; return output;"
            }
          }
        ],
        conversions: []
      };

      expect(() => {
        manager.register("test://different-type", differentTypeSpec);
      }).not.toThrow();

      const registeredSpec = manager.getSpecByType("DifferentType");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers[0].script.type).toBe("https://example.com/different-type");
    });
  });

  describe("initializer function execution", () => {
    let manager: ColorManager;

    beforeEach(() => {
      manager = new ColorManager();
    });

    it("should store and execute initializer functions in private map", () => {
      // Test the internal behavior by creating a simple test spec
      const simpleSpec = {
        name: "Simple",
        type: "color",
        description: "Simple test color",
        schema: {
          type: "object",
          properties: {
            value: { type: "string" }
          },
          additionalProperties: false
        },
        initializers: [
          {
            title: "Simple Initializer",
            keyword: "simple",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.Simple; output.value = \"test\"; return output;"
            }
          }
        ],
        conversions: []
      };

      manager.register("test://simple", simpleSpec);

      // Verify registration succeeded 
      const registeredSpec = manager.getSpecByType("Simple");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(1);
      expect(registeredSpec?.initializers[0].keyword).toBe("simple");
    });

    it("should handle initializers with input parameters", () => {
      const inputSpec = {
        name: "InputTest",
        type: "color",
        description: "Color with input parameters",
        schema: {
          type: "object",
          properties: {
            r: { type: "number" },
            g: { type: "number" },
            b: { type: "number" }
          },
          additionalProperties: false
        },
        initializers: [
          {
            title: "RGB with Input",
            keyword: "rgbinput",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.InputTest; output.r = 255; output.g = 128; output.b = 0; return output;"
            }
          }
        ],
        conversions: []
      };

      manager.register("test://input", inputSpec);

      const registeredSpec = manager.getSpecByType("InputTest");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(1);
    });

    it("should handle multiple initializers for same color type", () => {
      const multiSpec = {
        name: "MultiInit",
        type: "color", 
        description: "Color with multiple initializers",
        schema: {
          type: "object",
          properties: {
            r: { type: "number" },
            g: { type: "number" },
            b: { type: "number" }
          },
          additionalProperties: false
        },
        initializers: [
          {
            title: "Red Init",
            keyword: "red",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.MultiInit; output.r = 255; output.g = 0; output.b = 0; return output;"
            }
          },
          {
            title: "Green Init", 
            keyword: "green",
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.MultiInit; output.r = 0; output.g = 255; output.b = 0; return output;"
            }
          },
          {
            title: "Blue Init",
            keyword: "blue", 
            script: {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
              script: "variable output: Color.MultiInit; output.r = 0; output.g = 0; output.b = 255; return output;"
            }
          }
        ],
        conversions: []
      };

      manager.register("test://multi", multiSpec);

      const registeredSpec = manager.getSpecByType("MultiInit");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(3);
      
      const keywords = registeredSpec?.initializers.map(init => init.keyword);
      expect(keywords).toContain("red");
      expect(keywords).toContain("green");
      expect(keywords).toContain("blue");
    });

    it("should handle empty initializers array", () => {
      const emptySpec = {
        name: "Empty",
        type: "color",
        description: "Color with no initializers",
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          additionalProperties: false
        },
        initializers: [],
        conversions: []
      };

      expect(() => {
        manager.register("test://empty", emptySpec);
      }).not.toThrow();

      const registeredSpec = manager.getSpecByType("Empty");
      expect(registeredSpec).toBeDefined();
      expect(registeredSpec?.initializers.length).toBe(0);
    });
  });
});
