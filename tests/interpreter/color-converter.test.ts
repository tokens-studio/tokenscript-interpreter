import { describe, expect, it } from "vitest";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";
import { ListSymbol as List, NumberSymbol } from "../../interpreter/symbols";

describe("Color Converter - Hex to RGB", () => {
  it("should convert hex color to RGB (6 digit)", () => {
    const text = `
    variable color_parts: List = {COLOR}.split("#");
    variable color: List = color_parts.get(1).split();
    variable length: Number = color.length();
    variable rgb: List = 0, 0, 0;
    if(length == 3) [
        rgb.update(0, parse_int(color.get(0).concat(color.get(0)), 16));
        rgb.update(1, parse_int(color.get(1).concat(color.get(1)), 16));
        rgb.update(2, parse_int(color.get(2).concat(color.get(2)), 16));
    ] else [
        rgb.update(0, parse_int(color.get(0).concat(color.get(1)), 16));
        rgb.update(1, parse_int(color.get(2).concat(color.get(3)), 16));
        rgb.update(2, parse_int(color.get(4).concat(color.get(5)), 16));
    ];

    return rgb;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { COLOR: "#FF5733" });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("255, 87, 51");
  });

  it("should convert hex color to RGB (3 digit)", () => {
    const text = `
    variable color_parts: List = {COLOR}.split("#");
    variable color: List = color_parts.get(1).split();
    variable length: Number = color.length();
    variable rgb: List = 0, 0, 0;
    if(length == 3) [
        rgb.update(0, parse_int(color.get(0).concat(color.get(0)), 16));
        rgb.update(1, parse_int(color.get(1).concat(color.get(1)), 16));
        rgb.update(2, parse_int(color.get(2).concat(color.get(2)), 16));
    ] else [
        rgb.update(0, parse_int(color.get(0).concat(color.get(1)), 16));
        rgb.update(1, parse_int(color.get(2).concat(color.get(3)), 16));
        rgb.update(2, parse_int(color.get(4).concat(color.get(5)), 16));
    ];

    return rgb;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { COLOR: "#FF5" });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("255, 255, 85");
  });
});

describe("Color Converter - RGB to Linear RGB", () => {
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
    const rgbList = new List([new NumberSymbol(255), new NumberSymbol(0), new NumberSymbol(0)]);
    const interpreter = new Interpreter(parser, { rgb: rgbList });
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
    const rgbList = new List([new NumberSymbol(5), new NumberSymbol(5), new NumberSymbol(5)]);
    const interpreter = new Interpreter(parser, { rgb: rgbList });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    // Low values should use the linear formula (r / 12.92)
    const expectedR = 5 / 255 / 12.92;
    expect(Number.parseFloat(result?.elements[0].toString())).toBeCloseTo(expectedR, 5);
  });
});
