import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { ColorManager, Config } from "../../interpreter/config";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";
import { ListSymbol, NumberSymbol } from "../../interpreter/symbols";

describe("Color Manager - Setup and Registration", () => {
  it("should create a ColorManager instance", () => {
    const colorManager = new ColorManager();
    expect(colorManager).toBeDefined();
    expect(colorManager.colorTypes).toBeDefined();
    expect(colorManager.functions).toBeDefined();
    expect(colorManager.names).toBeDefined();
    expect(colorManager.colorTransforms).toBeDefined();
  });

  it("should setup RGB color format from specification", () => {
    const colorManager = new ColorManager();
    const rgbSpec = {
      $type: "https://schemas.tokens.studio/tokens/foundations/types/color.json",
      $id: "https://schemas.tokens.studio/tokens/foundations/types/rgb.json",
      name: "RGB",
      description: "RGB color",
      schema: {
        type: "object",
        properties: {
          r: { type: "number", minimum: 0, maximum: 255 },
          g: { type: "number", minimum: 0, maximum: 255 },
          b: { type: "number", minimum: 0, maximum: 255 },
        },
        required: ["r", "g", "b"],
        additionalProperties: false,
      },
      initializers: [
        {
          $type:
            "https://schemas.tokens.studio/tokens/foundations/types/color-initializer-function.json",
          title: "function",
          keyword: "rgb",
          description: "Creates a RGB color from r, g, b values",
          script: {
            type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
            script:
              "variable r: Number = {input}.get(0); variable g: Number = {input}.get(1); variable b: Number = {input}.get(2); return r, g, b;",
          },
        },
      ],
      conversions: [],
      stringify: {
        type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
        script:
          "return 'rgb('.concat({value}.r.to_string()).concat(', ').concat({value}.g.to_string()).concat(', ').concat({value}.b.to_string()).concat(')')",
      },
    };

    colorManager.setupColorFormat(rgbSpec);

    expect(colorManager.names["rgb"]).toBe(
      "https://schemas.tokens.studio/tokens/foundations/types/rgb.json"
    );
    expect(colorManager.functions["rgb"]).toBeDefined();
    expect(
      colorManager.colorTypes["https://schemas.tokens.studio/tokens/foundations/types/rgb.json"]
    ).toBeDefined();
  });

  it("should throw error for invalid color format specification", () => {
    const colorManager = new ColorManager();
    const invalidSpec = {
      name: "RGB",
      description: "RGB color",
      // Missing required $id field
    };

    expect(() => colorManager.setupColorFormat(invalidSpec)).toThrow(
      "Color format specification must have an $id"
    );
  });

  it("should throw error for missing name in specification", () => {
    const colorManager = new ColorManager();
    const invalidSpec = {
      $id: "https://schemas.tokens.studio/tokens/foundations/types/rgb.json",
      description: "RGB color",
      // Missing required name field
    };

    expect(() => colorManager.setupColorFormat(invalidSpec)).toThrow(
      "Color format specification must have a name"
    );
  });
});

describe("Color Manager - Color Type Creation", () => {
  it("should create RGB color instance from function call", () => {
    const colorManager = new ColorManager();
    const rgbSpec = {
      $type: "https://schemas.tokens.studio/tokens/foundations/types/color.json",
      $id: "https://schemas.tokens.studio/tokens/foundations/types/rgb.json",
      name: "RGB",
      description: "RGB color",
      schema: {
        type: "object",
        properties: {
          r: { type: "number", minimum: 0, maximum: 255 },
          g: { type: "number", minimum: 0, maximum: 255 },
          b: { type: "number", minimum: 0, maximum: 255 },
        },
        required: ["r", "g", "b"],
        additionalProperties: false,
      },
      initializers: [
        {
          $type:
            "https://schemas.tokens.studio/tokens/foundations/types/color-initializer-function.json",
          title: "function",
          keyword: "rgb",
          description: "Creates a RGB color from r, g, b values",
          script: {
            type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
            script:
              "variable r: Number = {input}.get(0); variable g: Number = {input}.get(1); variable b: Number = {input}.get(2); return r, g, b;",
          },
        },
      ],
      conversions: [],
      stringify: {
        type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
        script:
          "return 'rgb('.concat({value}.r.to_string()).concat(', ').concat({value}.g.to_string()).concat(', ').concat({value}.b.to_string()).concat(')')",
      },
    };

    colorManager.setupColorFormat(rgbSpec);

    const rgbValues = new ListSymbol([
      new NumberSymbol(255),
      new NumberSymbol(0),
      new NumberSymbol(0),
    ]);
    const color = colorManager.initColorFormat("rgb", rgbValues);

    expect(color).toBeDefined();
    expect(color.type).toBe("Color.RGB");
  });
});

describe("Color Manager - Integration with Interpreter", () => {
  it("should work with interpreter to create RGB colors", () => {
    const colorManager = new ColorManager();
    const rgbSpec = {
      $type: "https://schemas.tokens.studio/tokens/foundations/types/color.json",
      $id: "https://schemas.tokens.studio/tokens/foundations/types/rgb.json",
      name: "RGB",
      description: "RGB color",
      schema: {
        type: "object",
        properties: {
          r: { type: "number", minimum: 0, maximum: 255 },
          g: { type: "number", minimum: 0, maximum: 255 },
          b: { type: "number", minimum: 0, maximum: 255 },
        },
        required: ["r", "g", "b"],
        additionalProperties: false,
      },
      initializers: [
        {
          $type:
            "https://schemas.tokens.studio/tokens/foundations/types/color-initializer-function.json",
          title: "function",
          keyword: "rgb",
          description: "Creates a RGB color from r, g, b values",
          script: {
            type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
            script:
              "variable r: Number = {input}.get(0); variable g: Number = {input}.get(1); variable b: Number = {input}.get(2); return r, g, b;",
          },
        },
      ],
      conversions: [],
      stringify: {
        type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
        script:
          "return 'rgb('.concat({value}.r.to_string()).concat(', ').concat({value}.g.to_string()).concat(', ').concat({value}.b.to_string()).concat(')')",
      },
    };

    colorManager.setupColorFormat(rgbSpec);

    const code = `
    variable color: Color.RGB = rgb(255, 0, 0);
    return color;
    `;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(
      parser,
      {},
      undefined,
      new Config({ colorManager }),
    );
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toContain("rgb(255, 0, 0)");
  });

  it("should handle RGB color with attribute access", () => {
    const colorManager = new ColorManager();
    const rgbSpec = {
      $type: "https://schemas.tokens.studio/tokens/foundations/types/color.json",
      $id: "https://schemas.tokens.studio/tokens/foundations/types/rgb.json",
      name: "RGB",
      description: "RGB color",
      schema: {
        type: "object",
        properties: {
          r: { type: "number", minimum: 0, maximum: 255 },
          g: { type: "number", minimum: 0, maximum: 255 },
          b: { type: "number", minimum: 0, maximum: 255 },
        },
        required: ["r", "g", "b"],
        additionalProperties: false,
      },
      initializers: [
        {
          $type:
            "https://schemas.tokens.studio/tokens/foundations/types/color-initializer-function.json",
          title: "function",
          keyword: "rgb",
          description: "Creates a RGB color from r, g, b values",
          script: {
            type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
            script:
              "variable r: Number = {input}.get(0); variable g: Number = {input}.get(1); variable b: Number = {input}.get(2); return r, g, b;",
          },
        },
      ],
      conversions: [],
      stringify: {
        type: "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
        script:
          "return 'rgb('.concat({value}.r.to_string()).concat(', ').concat({value}.g.to_string()).concat(', ').concat({value}.b.to_string()).concat(')')",
      },
    };

    colorManager.setupColorFormat(rgbSpec);

    const code = `
    variable color: Color.RGB = rgb(255, 128, 64);
    variable red: Number = color.r;
    variable green: Number = color.g;
    variable blue: Number = color.b;
    `;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(
      parser,
      {},
      undefined,
      new Config({ colorManager }),
    );
    interpreter.interpret();

    const red = interpreter.symbolTable.get("red");
    const green = interpreter.symbolTable.get("green");
    const blue = interpreter.symbolTable.get("blue");

    expect(red?.value).toBe(255);
    expect(green?.value).toBe(128);
    expect(blue?.value).toBe(64);
  });

  it("should load RGB specification from file and work with interpreter", () => {
    const colorManager = new ColorManager();

    // Load RGB specification from file
    const rgbSpecPath = path.join(process.cwd(), "specifications", "colors", "rgb.json");
    const rgbSpec = JSON.parse(fs.readFileSync(rgbSpecPath, "utf8"));

    colorManager.setupColorFormat(rgbSpec);

    const code = `
    variable primaryColor: Color.RGB = rgb(255, 0, 0);
    variable secondaryColor: Color.RGB = rgb(0, 255, 0);
    variable blueComponent: Number = rgb(0, 0, 255).b;
    return primaryColor;
    `;

    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(
      parser,
      {},
      undefined,
      new Config({ colorManager }),
    );
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toContain("rgb(255, 0, 0)");

    // Check that variables were created correctly
    const primaryColor = interpreter.symbolTable.get("primaryColor");
    const secondaryColor = interpreter.symbolTable.get("secondaryColor");
    const blueComponent = interpreter.symbolTable.get("blueComponent");

    expect(primaryColor?.type).toBe("Color.RGB");
    expect(secondaryColor?.type).toBe("Color.RGB");
    expect(blueComponent?.value).toBe(255);
  });
});
