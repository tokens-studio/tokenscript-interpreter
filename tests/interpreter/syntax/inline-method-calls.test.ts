import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Config } from "@interpreter/config/config";
import { ColorManager } from "@interpreter/config/managers/color/manager";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { ColorSymbol } from "@interpreter/symbols";

function setupColorManagerWithRgb(): ColorManager {
  const colorManager = new ColorManager();
  const rgbSpecUri = "./data/specifications/colors/rgb.json";
  const rgbSpec = JSON.parse(readFileSync(rgbSpecUri, "utf-8"));
  colorManager.register(rgbSpecUri, rgbSpec);
  return colorManager;
}

function interpretWithColorManager(code: string, colorManager: ColorManager, references?: any, inlineMode = false) {
  const lexer = new Lexer(code);
  const parser = new Parser(lexer);
  const ast = parser.parse(inlineMode);
  const config = new Config({ colorManager });
  const interpreter = new Interpreter(ast, { config, references });
  return interpreter.interpret();
}

describe("Inline Method Calls", () => {
  it("should support inline color function calls with method chaining", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const result = interpretWithColorManager("rgb(255,255,255).to.hex()", colorManager, {}, true);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("Hex");
    expect(result?.toString()).toBe("#ffffff");
  });

  it("should support inline color function calls with different RGB values", () => {
    const colorManager = setupColorManagerWithRgb();
    
    const result = interpretWithColorManager("rgb(255,0,128).to.hex()", colorManager, {}, true);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("Hex");
    expect(result?.toString()).toBe("#ff0080");
  });

  it("should work the same as variable assignment approach", () => {
    const colorManager = setupColorManagerWithRgb();
    
    // Inline approach
    const inlineResult = interpretWithColorManager("rgb(255,255,255).to.hex()", colorManager, {}, true);
    
    // Variable assignment approach
    const variableCode = `
      variable color: Color.Rgb = rgb(255,255,255);
      color.to.hex()
    `;
    const variableResult = interpretWithColorManager(variableCode, colorManager);
    
    expect(inlineResult?.toString()).toBe(variableResult?.toString());
    expect(inlineResult?.toString()).toBe("#ffffff");
  });

  it("should support complex inline expressions", () => {
    const colorManager = setupColorManagerWithRgb();
    
    // This tests that the parser can handle the nested structure correctly
    const result = interpretWithColorManager("rgb(128, 64, 32).to.hex()", colorManager, {}, true);
    
    expect(result).toBeInstanceOf(ColorSymbol);
    expect((result as ColorSymbol).subType).toBe("Hex");
    expect(result?.toString()).toBe("#804020");
  });
});