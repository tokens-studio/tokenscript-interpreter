import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterpreter } from "@tests/interpreter/test-helpers";
import { Config } from "@interpreter/config/config";

describe("Color Attributes - RGB Color Type", () => {
  let config: Config;

  beforeEach(() => {
    const spec = readFileSync(join(__dirname, "../../../data/specifications/colors/rgb.json"), "utf-8");
    config = new Config();
    config.colorManager.register("test://rgb", spec);
  });

  it("should verify RGB color type is registered in color manager", () => {
    expect(config.colorManager).toBeDefined();
    const interpreter = createInterpreter("variable color: Color.RGB;", {}, config);
    expect(() => interpreter.interpret()).not.toThrow();
  });

  it("should allow attribute assignment for dynamic color", () => {
    const text = `
      variable color: Color.RGB;
      color.r = 10;
      color.g = 20;
      color.b = 30;
      color;
    `;
    const interpreter = createInterpreter(text, {}, config);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result.type).toBe("Color");
    expect(result.subType).toBe("RGB");
    expect(result.value.r.value).toBe(10);
    expect(result.value.g.value).toBe(20);
    expect(result.value.b.value).toBe(30);
  });

  it("should allow attribute access for dynamic color", () => {
    const text = `
      variable color: Color.RGB;
      color.r = 255;
      color.g = 128;
      color.b = 64;
      color.r;
    `;
    const interpreter = createInterpreter(text, {}, config);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result.type).toBe("Number");
    expect(result.value).toBe(255);
  });

  it("should allow accessing different attributes of dynamic color", () => {
    const text = `
      variable color: Color.RGB;
      color.r = 100;
      color.g = 200;
      color.b = 50;
      color.g;
    `;
    const interpreter = createInterpreter(text, {}, config);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result.type).toBe("Number");
    expect(result.value).toBe(200);
  });

  it("should throw error when accessing non-existent attribute on dynamic color", () => {
    const text = `
      variable color: Color.RGB;
      color.r = 10;
      color.g = 20;
      color.b = 30;
      color.nonexistent;
    `;
    const interpreter = createInterpreter(text, {}, config);
    expect(() => interpreter.interpret()).toThrow("Attribute 'nonexistent' not found on Color");
  });

  it("should throw error when accessing attribute on hex color", () => {
    const text = `
      variable color: Color = #ff0000;
      color.r;
    `;
    const interpreter = createInterpreter(text, {}, config);
    expect(() => interpreter.interpret()).toThrow("Attribute 'r' not found on Color");
  });

  it("should throw error when accessing attribute on null color", () => {
    const text = `
      variable color: Color;
      color.r;
    `;
    const interpreter = createInterpreter(text, {}, config);
    expect(() => interpreter.interpret()).toThrow("Attribute 'r' not found on Color");
  });

  it("should allow attribute access in expressions", () => {
    const text = `
      variable color: Color.RGB;
      color.r = 100;
      color.g = 50;
      color.b = 25;
      color.r + color.g;
    `;
    const interpreter = createInterpreter(text, {}, config);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result.type).toBe("Number");
    expect(result.value).toBe(150);
  });

  it("should allow attribute access in complex expressions", () => {
    const text = `
      variable color1: Color.RGB;
      variable color2: Color.RGB;
      color1.r = 200;
      color1.g = 100;
      color2.r = 50;
      color2.g = 150;
      (color1.r + color2.r) * 2;
    `;
    const interpreter = createInterpreter(text, {}, config);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result.type).toBe("Number");
    expect(result.value).toBe(500);
  });
});
