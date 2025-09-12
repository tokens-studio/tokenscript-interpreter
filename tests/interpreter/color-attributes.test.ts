import { describe, expect, it, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import { Interpreter } from "@/interpreter/interpreter";
import { Lexer } from "@/interpreter/lexer";
import { Parser } from "@/interpreter/parser";
import { Config } from "@/interpreter/config/config";

describe("Color Attributes - RGB Color Type", () => {
  let config: Config;

  beforeEach(() => {
      const spec = fs.readFileSync(path.join(__dirname, "../../specifications/colors/rgb.json"), "utf-8");
      config = new Config()
      config.colorManager.register("test://rgb", spec)
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
    color.r = 10;
    color.g = 20;
    color.b = 30;
    color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { config });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result.type).toBe("Color");
    expect(result.subType).toBe("RGB");

    expect(result.getAttribute("r")?.value).toBe(10);
    expect(result.getAttribute("g")?.value).toBe(20);
    expect(result.getAttribute("b")?.value).toBe(30);
  });
});
