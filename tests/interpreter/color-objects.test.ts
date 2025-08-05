import { describe, expect, it } from "vitest";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";
import * as fs from "node:fs";
import * as path from "node:path";
import { ColorManager } from "../../interpreter/colorManager";
import { ListSymbol, NumberSymbol } from "../../interpreter/symbols";

describe("Color Objects - Hex Color Literals", () => {
    it("should handle hex color literals", () => {
        const text = `
    variable color: Color = #FF5733;
    return color;
    `;
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
        const result = interpreter.interpret();

        expect(result).toBeDefined();
        expect(result?.toString()).toBe("#FF5733");
    });

    it("should handle 3-digit hex color literals", () => {
        const text = `
    variable color: Color = #F53;
    return color;
    `;
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
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
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
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
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
        interpreter.interpret();

        const red = getSymbol(interpreter, "red");
        const green = getSymbol(interpreter, "green");
        const blue = getSymbol(interpreter, "blue");
        const result = getSymbol(interpreter, "result");

        expect(red?.toString()).toBe("#FF0000");
        expect(green?.toString()).toBe("#00FF00");
        expect(blue?.toString()).toBe("#0000FF");
        expect(result?.toString()).toBe("#FF0000, #00FF00, #0000FF");
    });

    it("should handle color assignment", () => {
        const text = `
    variable color: Color = #FFFFFF;
    color = #000000;
    return color;
    `;
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
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
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
        interpreter.interpret();

        const same = getSymbol(interpreter, "same");
        const different = getSymbol(interpreter, "different");

        expect(same?.value).toBe(true);
        expect(different?.value).toBe(false);
    });

    it("should handle colors in lists", () => {
        const text = `
    variable palette: List = #FF0000, #00FF00, #0000FF, #FFFF00;
    variable first: Color = palette.get(0);
    variable length: Number = palette.length();
    `;
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {});
        interpreter.interpret();

        const palette = getSymbol(interpreter, "palette");
        const first = getSymbol(interpreter, "first");
        const length = getSymbol(interpreter, "length");

        expect(palette?.elements.length).toBe(4);
        expect(first?.toString()).toBe("#FF0000");
        expect(length?.value).toBe(4);
    });

    it("should handle color references", () => {
        const text = `
    variable theme_color: Color = {primary_color};
    return theme_color;
    `;
        const lexer = new Lexer(text);
        const parser = new Parser(lexer);
        const interpreter = new Interpreter(parser, {
            primary_color: "#3366CC",
        });
        const result = interpreter.interpret();

        expect(result).toBeDefined();
        expect(result?.toString()).toBe("#3366CC");
    });
});

describe("Color Objects - Dynamic Color Types", () => {
    it("should initialize color types (dynamic)", () => {
        const rgbSpecPath = path.join(
            process.cwd(),
            "specifications",
            "colors",
            "rgb.json",
        );
        const rgbSpec = JSON.parse(fs.readFileSync(rgbSpecPath, "utf8"));
        const cm = new ColorManager();
        cm.setupColorFormat(rgbSpec);
        expect(cm.functions).toHaveProperty("rgb");
    });

    it("should initialize color types with values (dynamic)", () => {
        const rgbSpecPath = path.join(
            process.cwd(),
            "specifications",
            "colors",
            "rgb.json",
        );
        const rgbSpec = JSON.parse(fs.readFileSync(rgbSpecPath, "utf8"));
        const cm = new ColorManager();
        cm.setupColorFormat(rgbSpec);
        const color = cm.initColorFormat(
            "rgb",
            new ListSymbol([
                new NumberSymbol(255),
                new NumberSymbol(0),
                new NumberSymbol(0),
            ]),
        );
        expect(color._typeName).toBe("rgb");
    });

    it("should use color types in interpreter (dynamic)", () => {
        const rgbSpecPath = path.join(
            process.cwd(),
            "specifications",
            "colors",
            "rgb.json",
        );
        const rgbSpec = JSON.parse(fs.readFileSync(rgbSpecPath, "utf8"));
        const cm = new ColorManager();
        cm.setupColorFormat(rgbSpec);
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
            undefined,
            cm,
        );
        const result = interpreter.interpret();
        expect(result._typeName).toBe("rgb");
    });
});

// Helper to access symbolTable for tests
function getSymbol(interpreter: any, name: string) {
    // @ts-expect-error: access private for test
    return interpreter.symbolTable.get(name);
}
