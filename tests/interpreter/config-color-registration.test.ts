import { describe, it, expect, beforeEach } from "vitest";
import { Config } from "@interpreter/config/config";
import { ColorManager } from "@interpreter/config/managers/color/manager";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { InterpreterError } from "@interpreter/errors";
import { ColorSymbol } from "@interpreter/symbols";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Config and ColorManager - Color Registration", () => {
  let colorManager: ColorManager;
  let config: Config;

  beforeEach(() => {
    colorManager = new ColorManager();
    config = new Config({ colorManager });
  });

  describe("ColorManager Registration", () => {
    it("should register RGB color specification from JSON file", () => {
      const rgbSpecPath = path.join(__dirname, "../../data/specifications/colors/rgb.json");
      const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
      const rgbSpec = JSON.parse(rgbSpecString);

      const spec = colorManager.register("test://rgb", rgbSpec);

      expect(spec).toBeDefined();
      expect(spec.name).toBe("RGB");
      expect(spec.type).toBe("color");
      expect(spec.schema.properties).toHaveProperty("r");
      expect(spec.schema.properties).toHaveProperty("g");
      expect(spec.schema.properties).toHaveProperty("b");
    });

    it("should register RGB color specification from object", () => {
      const rgbSpec = {
        name: "RGB",
        type: "color",
        description: "RGB color",
        schema: {
          type: "object",
          properties: {
            r: { type: "number" },
            g: { type: "number" },
            b: { type: "number" }
          },
          required: ["r", "g", "b"],
          order: ["r", "g", "b"],
          additionalProperties: false
        },
        initializers: [],
        conversions: []
      };

      const registeredSpec = colorManager.register("test://rgb-object", rgbSpec);

      expect(registeredSpec).toBeDefined();
      expect(registeredSpec.name).toBe("RGB");
      expect(registeredSpec.type).toBe("color");
    });

    it("should retrieve registered color specification by URI", () => {
      const rgbSpec = {
        name: "TestRGB",
        type: "color",
        description: "Test RGB color",
        schema: { type: "object", properties: {} },
        initializers: [],
        conversions: []
      };

      colorManager.register("test://test-rgb", rgbSpec);
      const retrieved = colorManager.getSpec("test://test-rgb");

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("TestRGB");
    });

    it("should retrieve registered color specification by type", () => {
      const rgbSpec = {
        name: "TestRGB",
        type: "color",
        description: "Test RGB color",
        schema: { type: "object", properties: {} },
        initializers: [],
        conversions: []
      };

      colorManager.register("test://test-rgb", rgbSpec);
      const retrieved = colorManager.getSpecByType("TestRGB");

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("TestRGB");
    });

    it("should be case-insensitive when retrieving by type", () => {
      const rgbSpec = {
        name: "TestRGB",
        type: "color",
        description: "Test RGB color",
        schema: { type: "object", properties: {} },
        initializers: [],
        conversions: []
      };

      colorManager.register("test://test-rgb", rgbSpec);
      
      const retrieved1 = colorManager.getSpecByType("testrgb");
      const retrieved2 = colorManager.getSpecByType("TESTRGB");
      const retrieved3 = colorManager.getSpecByType("TestRgb");

      expect(retrieved1).toBeDefined();
      expect(retrieved2).toBeDefined();
      expect(retrieved3).toBeDefined();
      expect(retrieved1?.name).toBe("TestRGB");
      expect(retrieved2?.name).toBe("TestRGB");
      expect(retrieved3?.name).toBe("TestRGB");
    });

    it("should throw error for invalid color specification", () => {
      const invalidSpec = {
        name: "Invalid",
        // Missing required 'type' field
        description: "Invalid color",
        schema: { type: "object", properties: {} },
        initializers: [],
        conversions: []
      };

      expect(() => {
        colorManager.register("test://invalid", invalidSpec as any);
      }).toThrow("Invalid color specification");
    });
  });

  describe("Config Integration", () => {
    beforeEach(() => {
      // Register RGB specification for tests
      const rgbSpec = {
        name: "RGB",
        type: "color",
        description: "RGB color",
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
        initializers: [],
        conversions: []
      };
      colorManager.register("test://rgb", rgbSpec);
    });

    it("should recognize registered color types", () => {
      const isRegistered = config.isTypeDefined("Color", "RGB");
      expect(isRegistered).toBe(true);
    });

    it("should not recognize unregistered color types", () => {
      const isRegistered = config.isTypeDefined("Color", "Missing");
      expect(isRegistered).toBe(false);
    });

    it("should create empty color symbol for registered type", () => {
      const colorSymbol = config.getType("Color", "RGB");
      
      expect(colorSymbol).toBeInstanceOf(ColorSymbol);
      expect((colorSymbol as ColorSymbol).subType).toBe("RGB");
    });

    it("should throw error when creating symbol for unregistered type", () => {
      expect(() => {
        config.getType("Color", "Missing");
      }).toThrow("No spec found for Missing");
    });

    it("should create error with specific message for missing spec", () => {
      let error: Error | null = null;
      try {
        config.getType("Color", "MissingSpec");
      } catch (e) {
        error = e as Error;
      }
      
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("No spec found for MissingSpec");
    });
  });

  describe("Interpreter Integration", () => {
    beforeEach(() => {
      // Register RGB specification for interpreter tests
      const rgbSpec = {
        name: "RGB",
        type: "color",
        description: "RGB color",
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
        initializers: [],
        conversions: []
      };
      colorManager.register("test://rgb", rgbSpec);
    });

    it("should successfully declare and use registered color type", () => {
      const code = `
        variable color: Color.RGB;
        color
      `;
      
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, { config });
      
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(ColorSymbol);
      const colorResult = result as ColorSymbol;
      expect(colorResult.subType).toBe("RGB");
      expect(colorResult.value).toBeNull(); // Uninitialized
    });

    it("should verify subtype of registered color", () => {
      const code = `
        variable color: Color.RGB;
        color
      `;
      
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, { config });
      
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(ColorSymbol);
      const colorResult = result as ColorSymbol;
      expect(colorResult.subType).toBe("RGB");
      expect(colorResult.type).toBe("Color");
    });

    it("should throw error with metadata for unregistered color type", () => {
      const code = `
        variable color: Color.Missing;
        color
      `;
      
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, { config });
      
      let error: InterpreterError | null = null;
      try {
        interpreter.interpret();
      } catch (e) {
        error = e as InterpreterError;
      }
      
      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.message).toContain("Invalid variable type 'Color.Missing'");
      expect(error?.meta).toBeDefined();
      expect(error?.meta?.baseType).toBe("Color");
      expect(error?.meta?.subType).toBe("Missing");
      expect(error?.meta?.config).toBe(config);
    });

    it("should handle multiple registered color types", () => {
      // Register another color type
      const hslSpec = {
        name: "HSL",
        type: "color",
        description: "HSL color",
        schema: {
          type: "object",
          properties: {
            h: { type: "number" },
            s: { type: "number" },
            l: { type: "number" }
          },
          required: ["h", "s", "l"],
          additionalProperties: false
        },
        initializers: [],
        conversions: []
      };
      colorManager.register("test://hsl", hslSpec);

      const code = `
        variable rgbColor: Color.RGB;
        variable hslColor: Color.HSL;
        rgbColor
      `;
      
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, { config });
      
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(ColorSymbol);
      const colorResult = result as ColorSymbol;
      expect(colorResult.subType).toBe("RGB");

      // Verify both types are recognized
      expect(config.isTypeDefined("Color", "RGB")).toBe(true);
      expect(config.isTypeDefined("Color", "HSL")).toBe(true);
    });

    it("should provide detailed error information for debugging", () => {
      const code = `
        variable color: Color.NonExistent;
      `;
      
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, { config });
      
      let error: InterpreterError | null = null;
      try {
        interpreter.interpret();
      } catch (e) {
        error = e as InterpreterError;
      }
      
      expect(error).toBeInstanceOf(InterpreterError);
      expect(error?.message).toContain("Invalid variable type 'Color.Nonexistent'");
      
      // Check metadata contains useful debugging info
      expect(error?.meta).toBeDefined();
      expect(error?.meta?.baseType).toBe("Color");
      expect(error?.meta?.subType).toBe("NonExistent");
      expect(error?.meta?.config).toBeInstanceOf(Config);
    });
  });

  describe("Default Color Types", () => {
    it("should have default Hex color type available", () => {
      const defaultColorManager = new ColorManager();
      const hexSpec = defaultColorManager.getSpecByType("Hex");
      
      expect(hexSpec).toBeDefined();
      expect(hexSpec?.name).toBe("Hex");
      expect(hexSpec?.type).toBe("color");
    });

    it("should work with default Hex color in interpreter", () => {
      const defaultConfig = new Config(); // Uses default ColorManager with Hex
      
      const code = `
        variable color: Color.Hex;
        color
      `;
      
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, { config: defaultConfig });
      
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(ColorSymbol);
      const colorResult = result as ColorSymbol;
      expect(colorResult.subType).toBe("Hex");
    });
  });
});
