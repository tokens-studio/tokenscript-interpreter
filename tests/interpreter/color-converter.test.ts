import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Config } from "../../interpreter/config/config";
import { ColorManager } from "../../interpreter/config/managers/color/manager";
import { InterpreterError } from "../../interpreter/errors";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";
import { ColorSymbol, ListSymbol as List, NumberSymbol } from "../../interpreter/symbols";

function setupColorManagerWithRgb(): ColorManager {
  const colorManager = new ColorManager();
  const rgbSpecUri = "./specifications/colors/rgb.json";
  const rgbSpec = JSON.parse(readFileSync(rgbSpecUri, "utf-8"));
  colorManager.register(rgbSpecUri, rgbSpec);
  return colorManager;
}

function interpretWithColorManager(code: string, colorManager: ColorManager, references?: any) {
  const lexer = new Lexer(code);
  const parser = new Parser(lexer);
  const config = new Config({ colorManager });
  const interpreter = new Interpreter(parser, { config, references });
  return interpreter.interpret();
}

describe("Color Conversion - Happy Path", () => {
  it("should convert RGB to HEX", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Rgb = rgb(255, 255, 255);
      c.to.hex()
    `;
    
    const result = interpretWithColorManager(code, colorManager);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("Hex");
    expect(result?.toString()).toBe("#ffffff");
  });

  it("should convert RGB with low values to HEX", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Rgb = rgb(10, 5, 0);
      c.to.hex()
    `;
    
    const result = interpretWithColorManager(code, colorManager);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("Hex");
    expect(result?.toString()).toBe("#0a0500");
  });

  it("should perform identity conversion (hex to hex)", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Hex = #FFF;
      c.to.hex()
    `;
    
    const result = interpretWithColorManager(code, colorManager);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("Hex");
    expect(result?.toString()).toBe("#FFF");
  });

  it("should convert HEX to RGB (6 digit)", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Hex = #ff5733;
      c.to.rgb()
    `;
    
    const result = interpretWithColorManager(code, colorManager);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("RGB");
    
    // Check RGB values by accessing properties
    const colorResult = result as ColorSymbol;
    expect(colorResult.value).toHaveProperty("r");
    expect(colorResult.value).toHaveProperty("g");
    expect(colorResult.value).toHaveProperty("b");
  });

  it("should convert HEX to RGB (3 digit)", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Hex = #f53;
      c.to.rgb()
    `;
    
    const result = interpretWithColorManager(code, colorManager);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("RGB");
  });

  it("should handle RGB color with attribute access", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Rgb;
      c.r = 255;
      c.g = 255;
      c.b = 255;
      c.r
    `;
    
    const result = interpretWithColorManager(code, colorManager);
    
    expect(result).toBeInstanceOf(NumberSymbol);
    expect(result?.toString()).toBe("255");
  });
});

describe("Color Conversion - Error Cases", () => {
  it("should throw error when source color type is not found", () => {
    const colorManager = new ColorManager(); // Empty color manager
    
    const code = `
      variable c: Color.Unknown = #fff;
      c.to.hex()
    `;
    
    expect(() => {
      interpretWithColorManager(code, colorManager);
    }).toThrow(InterpreterError);
  });

  it("should throw error when target color type is not found", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Hex = #fff;
      c.to.unknown()
    `;
    
    expect(() => {
      interpretWithColorManager(code, colorManager);
    }).toThrow(InterpreterError);
  });

  it("should throw error when conversion is not available", () => {
    // Create a color manager with only hex colors (no RGB)
    const colorManager = new ColorManager();
    
    const code = `
      variable c: Color.Hex = #fff;
      c.to.rgb()
    `;
    
    expect(() => {
      interpretWithColorManager(code, colorManager);
    }).toThrow(InterpreterError);
  });

  it("should throw error for incomplete RGB color conversion", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Rgb;
      c.r = 255;
      c.to.hex()
    `;
    
    expect(() => {
      interpretWithColorManager(code, colorManager);
    }).toThrow(InterpreterError);
  });

  it("should throw error for invalid RGB initializer arguments", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Rgb = rgb(255, 255);
      c
    `;
    
    expect(() => {
      interpretWithColorManager(code, colorManager);
    }).toThrow(InterpreterError);
  });

  it("should handle conversion with malformed hex color", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const code = `
      variable c: Color.Hex = #gggg;
      c.to.rgb()
    `;
    
    // This should either throw an error during conversion or handle it gracefully
    expect(() => {
      interpretWithColorManager(code, colorManager);
    }).toThrow();
  });
});

describe("Color Conversion - Manager Methods", () => {
  it("should check if conversion exists between URIs", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const hexUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/";
    const rgbUri = "./specifications/colors/rgb.json";
    
    expect(colorManager.hasConversion(hexUri, rgbUri)).toBe(true);
    expect(colorManager.hasConversion(rgbUri, hexUri)).toBe(true);
    expect(colorManager.hasConversion(hexUri, "non-existent")).toBe(false);
  });

  it("should check if conversion exists between types", () => {
    const colorManager = setupColorManagerWithRgb();
    
    expect(colorManager.hasConversionByType("hex", "rgb")).toBe(true);
    expect(colorManager.hasConversionByType("rgb", "hex")).toBe(true);
    expect(colorManager.hasConversionByType("hex", "unknown")).toBe(false);
    expect(colorManager.hasConversionByType("unknown", "hex")).toBe(false);
  });

  it("should perform direct color conversion by type", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const hexColor = new ColorSymbol("#ff0000", "Hex");
    const rgbColor = colorManager.convertToByType(hexColor, "rgb");
    
    expect(rgbColor).toBeInstanceOf(ColorSymbol);
    expect(rgbColor.subType).toBe("RGB");
  });

  it("should return same color for identity conversion by type", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const hexColor = new ColorSymbol("#ff0000", "Hex");
    const sameColor = colorManager.convertToByType(hexColor, "hex");
    
    expect(sameColor).toBe(hexColor); // Should be the exact same instance
  });

  it("should throw error for direct conversion with invalid types", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const hexColor = new ColorSymbol("#ff0000", "Hex");
    
    expect(() => {
      colorManager.convertToByType(hexColor, "unknown");
    }).toThrow(InterpreterError);
  });
});

describe("Legacy Color Converter Tests", () => {
  it("should convert hex color to RGB (6 digit)", () => {
    const text = `
    variable color_parts: List = {COLOR}.toString().split("#");
    variable color: List = color_parts.get(1).split();
    variable length: Number = color.length();
    variable rgb: List = 0, 0, 0;
    if(length == 3) [
        rgb.update(0, parseint(color.get(0).concat(color.get(0)), 16));
        rgb.update(1, parseint(color.get(1).concat(color.get(1)), 16));
        rgb.update(2, parseint(color.get(2).concat(color.get(2)), 16));
    ] else [
        rgb.update(0, parseint(color.get(0).concat(color.get(1)), 16));
        rgb.update(1, parseint(color.get(2).concat(color.get(3)), 16));
        rgb.update(2, parseint(color.get(4).concat(color.get(5)), 16));
    ];

    return rgb;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { references: { COLOR: "#FF5733" } });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("255, 87, 51");
  });

  it("should convert hex color to RGB (3 digit)", () => {
    const text = `
    variable color_parts: List = {COLOR}.toString().split("#");
    variable color: List = color_parts.get(1).split();
    variable length: Number = color.length();
    variable rgb: List = 0, 0, 0;
    if(length == 3) [
        rgb.update(0, parseint(color.get(0).concat(color.get(0)), 16));
        rgb.update(1, parseint(color.get(1).concat(color.get(1)), 16));
        rgb.update(2, parseint(color.get(2).concat(color.get(2)), 16));
    ] else [
        rgb.update(0, parseint(color.get(0).concat(color.get(1)), 16));
        rgb.update(1, parseint(color.get(2).concat(color.get(3)), 16));
        rgb.update(2, parseint(color.get(4).concat(color.get(5)), 16));
    ];

    return rgb;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { references: { COLOR: "#FF5" } });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("255, 255, 85");
  });

  it("should convert RGB to linear RGB", () => {
    const text = `
    variable rgb: List = {rgb};
    variable rgb_linear: List = 0, 0, 0;
    variable gamma: Number = 2.4;

    // Convert RGB to linear RGB
    variable r: Number = rgb.get(0) / 255;
    variable g: Number = rgb.get(1) / 255;
    variable b: Number = rgb.get(2) / 255;

    // Process red channel
    if(r <= 0.03928) [
        rgb_linear.update(0, r / 12.92);
    ] else [
        rgb_linear.update(0, pow((r + 0.055) / 1.055, gamma));
    ];

    // Process green channel
    if(g <= 0.03928) [
        rgb_linear.update(1, g / 12.92);
    ] else [
        rgb_linear.update(1, pow((g + 0.055) / 1.055, gamma));
    ];

    // Process blue channel
    if(b <= 0.03928) [
        rgb_linear.update(2, b / 12.92);
    ] else [
        rgb_linear.update(2, pow((b + 0.055) / 1.055, gamma));
    ];

    return rgb_linear;
    `;

    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const rgbList = new List([
      new NumberSymbol(255),
      new NumberSymbol(0),
      new NumberSymbol(0),
    ]);
    const interpreter = new Interpreter(parser, { references: { rgb: rgbList } });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("1, 0, 0");
  });

  it("should handle low RGB values in linear conversion", () => {
    const text = `
    variable rgb: List = {rgb};
    variable rgb_linear: List = 0, 0, 0;
    variable gamma: Number = 2.4;

    // Convert RGB to linear RGB
    variable r: Number = rgb.get(0) / 255;
    variable g: Number = rgb.get(1) / 255;
    variable b: Number = rgb.get(2) / 255;

    // Process red channel
    if(r <= 0.03928) [
        rgb_linear.update(0, r / 12.92);
    ] else [
        rgb_linear.update(0, pow((r + 0.055) / 1.055, gamma));
    ];

    // Process green channel
    if(g <= 0.03928) [
        rgb_linear.update(1, g / 12.92);
    ] else [
        rgb_linear.update(1, pow((g + 0.055) / 1.055, gamma));
    ];

    // Process blue channel
    if(b <= 0.03928) [
        rgb_linear.update(2, b / 12.92);
    ] else [
        rgb_linear.update(2, pow((b + 0.055) / 1.055, gamma));
    ];

    return rgb_linear;
    `;

    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const rgbList = new List([
      new NumberSymbol(5),
      new NumberSymbol(5),
      new NumberSymbol(5),
    ]);
    const interpreter = new Interpreter(parser, { references: { rgb: rgbList } });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    // Low values should use the linear formula (r / 12.92)
    const expectedR = 5 / 255 / 12.92;
    expect(Number.parseFloat(result?.elements[0].toString())).toBeCloseTo(
      expectedR,
      5,
    );
  });
});
