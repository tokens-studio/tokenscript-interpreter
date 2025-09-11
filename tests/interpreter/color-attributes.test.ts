import { describe, expect, it, beforeEach } from "vitest";
import { InterpreterError } from "../../interpreter/errors";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";
import { Config } from "../../interpreter/config/config";
import { ColorManager } from "../../interpreter/config/managers/color/manager";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Color Attributes - RGB Color Type", () => {
  let config: Config;

  beforeEach(() => {
    const colorManager = new ColorManager();
    
    const rgbSpecPath = path.join(__dirname, "../../specifications/colors/rgb.json");
    const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
    colorManager.register("test://rgb", rgbSpecString);
    
    config = new Config({ colorManager });
  });

  it("should verify RGB color type is registered in color manager", () => {
    expect(config.colorManager).toBeDefined();

    const text = `variable color: Color.RGB;`;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { config });

    expect(() => interpreter.interpret()).not.toThrow();
  });

  it("should support RGB component math operations", () => {
    const text = `
    variable color: Color.RGB;
    color.r = 100;
    color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { config });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    const colorResult = result as any;
    const expectedAvg = Math.round((100 + 150 + 200) / 3); // 150
    expect(colorResult.getAttribute("r")?.value).toBe(expectedAvg);
    expect(colorResult.getAttribute("g")?.value).toBe(expectedAvg);
    expect(colorResult.getAttribute("b")?.value).toBe(expectedAvg);
  });
});
