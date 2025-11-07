import { createInterpreter, interpretAndGetVariable, interpretAndGetVariables } from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("Color Objects - Hex Color Literals", () => {
  it("should handle hex color literals", () => {
    const text = `
      variable color: Color = #FF5733;
      return color;
    `;
    const interpreter = createInterpreter(text);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("#FF5733");
  });

  it("should handle 3-digit hex color literals", () => {
    const text = `
      variable color: Color = #F53;
      return color;
    `;
    const interpreter = createInterpreter(text);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("#F53");
  });

  it("should handle hex colors in expressions", () => {
    const text = `
      variable primary: Color = #FF0000;
      variable secondary: Color = #00FF00;
      variable colors: List = primary, secondary;
      return colors;
    `;
    const interpreter = createInterpreter(text);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("#FF0000, #00FF00");
  });
});

describe("Color Objects - Color Type System", () => {
  it("should handle color variable declarations", () => {
    const text = `
      variable red: Color = #FF0000;
      variable green: Color = #00FF00;
      variable blue: Color = #0000FF;
      variable result: List = red, green, blue;
    `;
    const vars = interpretAndGetVariables(text, ["red", "green", "blue", "result"]);

    expect(vars.red?.toString()).toBe("#FF0000");
    expect(vars.green?.toString()).toBe("#00FF00");
    expect(vars.blue?.toString()).toBe("#0000FF");
    expect(vars.result?.toString()).toBe("#FF0000, #00FF00, #0000FF");
  });

  it("should handle color assignment", () => {
    const text = `
      variable color: Color = #FFFFFF;
      color = #000000;
      return color;
    `;
    const interpreter = createInterpreter(text);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("#000000");
  });
});

describe("Color Objects - Color Operations", () => {
  it("should handle colors in conditional statements", () => {
    const text = `
      variable color1: Color = #FF0000;
      variable color2: Color = #FF0000;
      variable color3: Color = #00FF00;
      variable same: Boolean = color1 == color2;
      variable different: Boolean = color1 == color3;
    `;
    const vars = interpretAndGetVariables(text, ["same", "different"]);

    expect(vars.same?.value).toBe(true);
    expect(vars.different?.value).toBe(false);
  });

  it("should handle colors in lists", () => {
    const text = `
      variable palette: List = #FF0000, #00FF00, #0000FF, #FFFF00;
      variable first: Color = palette.get(0);
      variable length: Number = palette.length();
    `;
    const vars = interpretAndGetVariables(text, ["palette", "first", "length"]);

    expect(vars.palette?.elements.length).toBe(4);
    expect(vars.first?.toString()).toBe("#FF0000");
    expect(vars.length?.value).toBe(4);
  });

  it("should handle color references", () => {
    const text = `
      variable theme_color: Color = {primary_color};
      return theme_color;
    `;
    const interpreter = createInterpreter(text, { primary_color: "#3366CC" });
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.toString()).toBe("#3366CC");
  });

  it("should support to_string method on color objects", () => {
    const text = `
      variable color: Color = #FF5733;
      variable colorString: String = color.to_string();
      return colorString;
    `;
    const interpreter = createInterpreter(text);
    const result = interpreter.interpret();

    expect(result).toBeDefined();
    expect(result?.type).toBe("String");
    expect(result?.value).toBe("#FF5733");
  });

  it("should support to_string method on 3-digit hex colors", () => {
    const text = `
      variable color: Color = #F53;
      variable result: String = color.to_string();
    `;
    const result = interpretAndGetVariable(text, "result");

    expect(result?.type).toBe("String");
    expect(result?.value).toBe("#F53");
  });
});
