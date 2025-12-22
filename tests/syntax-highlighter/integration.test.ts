import { tokenscriptLanguage } from "@src/syntax-highlighter/prism";
import { PATTERNS } from "@src/syntax-highlighter/spec";
import { describe, expect, it } from "vitest";

/**
 * Tokenize code with Prism
 */
function tokenizeWithPrism(code: string): Record<string, string[]> {
  const mockPrism = { languages: {} };
  tokenscriptLanguage(mockPrism);
  const grammar = mockPrism.languages.tokenscript;

  const tokens: Record<string, string[]> = {};

  for (const [tokenName, tokenDef] of Object.entries(grammar)) {
    const pattern = typeof tokenDef === "object" && "pattern" in tokenDef ? tokenDef.pattern : tokenDef;

    if (!(pattern instanceof RegExp)) continue;

    const globalPattern = new RegExp(pattern.source, "g");
    const matches = code.match(globalPattern);

    if (matches) {
      tokens[tokenName] = matches;
    }
  }

  return tokens;
}

describe("Syntax Highlighter Integration Tests", () => {
  describe("Comments", () => {
    it("should tokenize single-line comments", () => {
      const code = "// This is a comment";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.comment).toBeDefined();
      expect(tokens.comment).toContain("// This is a comment");
    });

    it("should tokenize multiple comments", () => {
      const code = `
        // First comment
        variable x = 10
        // Second comment
      `;
      const tokens = tokenizeWithPrism(code);

      expect(tokens.comment).toBeDefined();
      expect(tokens.comment.length).toBe(2);
    });
  });

  describe("Strings", () => {
    it("should tokenize double-quoted strings", () => {
      const code = '"hello world"';
      const tokens = tokenizeWithPrism(code);

      expect(tokens.string).toBeDefined();
      expect(tokens.string).toContain('"hello world"');
    });

    it("should tokenize single-quoted strings", () => {
      const code = "'hello world'";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.string).toBeDefined();
      expect(tokens.string).toContain("'hello world'");
    });

    it("should tokenize strings with escape sequences", () => {
      const code = '"line1\\nline2"';
      const tokens = tokenizeWithPrism(code);

      expect(tokens.string).toBeDefined();
      expect(tokens.string).toContain('"line1\\nline2"');
    });
  });

  describe("References", () => {
    it("should tokenize TokenScript references", () => {
      const code = "{token.path}";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.reference).toBeDefined();
      expect(tokens.reference).toContain("{token.path}");
    });

    it("should tokenize nested path references", () => {
      const code = "{colors.primary.value}";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.reference).toBeDefined();
      expect(tokens.reference).toContain("{colors.primary.value}");
    });

    it("should tokenize multiple references in code", () => {
      const code = "variable x = {a} + {b}";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.reference).toBeDefined();
      expect(tokens.reference.length).toBe(2);
      expect(tokens.reference).toContain("{a}");
      expect(tokens.reference).toContain("{b}");
    });
  });

  describe("Hex Colors", () => {
    it("should tokenize 3-digit hex colors", () => {
      const code = "#fff";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["hex-color"]).toBeDefined();
      expect(tokens["hex-color"]).toContain("#fff");
    });

    it("should tokenize 6-digit hex colors", () => {
      const code = "#ff0000";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["hex-color"]).toBeDefined();
      expect(tokens["hex-color"]).toContain("#ff0000");
    });

    it("should tokenize 8-digit hex colors with alpha", () => {
      const code = "#ff000080";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["hex-color"]).toBeDefined();
      expect(tokens["hex-color"]).toContain("#ff000080");
    });

    it("should be case insensitive", () => {
      const code = "#FFF #AbCdEf #FFFFFFFF";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["hex-color"]).toBeDefined();
      expect(tokens["hex-color"]).toContain("#FFF");
      expect(tokens["hex-color"]).toContain("#AbCdEf");
      expect(tokens["hex-color"]).toContain("#FFFFFFFF");
    });
  });

  describe("Numbers with Units", () => {
    it("should tokenize pixels", () => {
      const code = "10px";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["number-with-unit"]).toBeDefined();
      expect(tokens["number-with-unit"]).toContain("10px");
    });

    it("should tokenize percentages", () => {
      const code = "100%";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["number-with-unit"]).toBeDefined();
      expect(tokens["number-with-unit"]).toContain("100%");
    });

    it("should tokenize degrees", () => {
      const code = "45deg";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["number-with-unit"]).toBeDefined();
      expect(tokens["number-with-unit"]).toContain("45deg");
    });

    it("should tokenize rems", () => {
      const code = "1.5rem";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["number-with-unit"]).toBeDefined();
      expect(tokens["number-with-unit"]).toContain("1.5rem");
    });

    it("should tokenize various units", () => {
      const code = "10px 2em 3rem 50% 90deg";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["number-with-unit"]).toBeDefined();
      expect(tokens["number-with-unit"].length).toBe(5);
    });
  });

  describe("Plain Numbers", () => {
    it("should tokenize integers", () => {
      const code = "123";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.number).toBeDefined();
      expect(tokens.number).toContain("123");
    });

    it("should tokenize floats", () => {
      const code = "123.456";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.number).toBeDefined();
      expect(tokens.number).toContain("123.456");
    });

    it("should tokenize scientific notation", () => {
      const code = "1e10 1.5e-10 2E+5";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.number).toBeDefined();
      expect(tokens.number.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Keywords", () => {
    it("should tokenize variable keyword", () => {
      const code = "variable x = 10";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toBeDefined();
      expect(tokens.keyword).toContain("variable");
    });

    it("should tokenize control flow keywords", () => {
      const code = "if else elif while return";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toBeDefined();
      expect(tokens.keyword).toContain("if");
      expect(tokens.keyword).toContain("else");
      expect(tokens.keyword).toContain("elif");
      expect(tokens.keyword).toContain("while");
      expect(tokens.keyword).toContain("return");
    });

    it("should tokenize boolean keywords", () => {
      const code = "true false";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toBeDefined();
      expect(tokens.keyword).toContain("true");
      expect(tokens.keyword).toContain("false");
    });

    it("should tokenize null and undefined", () => {
      const code = "null undefined";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toBeDefined();
      expect(tokens.keyword).toContain("null");
      expect(tokens.keyword).toContain("undefined");
    });
  });

  describe("Types", () => {
    it("should tokenize type names", () => {
      const code = "String Number Boolean Color List Dictionary NumberWithUnit";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.type).toBeDefined();
      expect(tokens.type).toContain("String");
      expect(tokens.type).toContain("Number");
      expect(tokens.type).toContain("Boolean");
      expect(tokens.type).toContain("Color");
      expect(tokens.type).toContain("List");
      expect(tokens.type).toContain("Dictionary");
      expect(tokens.type).toContain("NumberWithUnit");
    });

    it("should tokenize color types", () => {
      const code = "Color.Hex Color.Rgb Color.Hsl Color.Oklch";
      const tokens = tokenizeWithPrism(code);

      expect(tokens["color-type"]).toBeDefined();
      expect(tokens["color-type"]).toContain("Color.Hex");
      expect(tokens["color-type"]).toContain("Color.Rgb");
      expect(tokens["color-type"]).toContain("Color.Hsl");
      expect(tokens["color-type"]).toContain("Color.Oklch");
    });
  });

  describe("Functions", () => {
    it("should tokenize color functions", () => {
      const code = "rgb hsl oklch hex srgb lrgb";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.function).toBeDefined();
      expect(tokens.function).toContain("rgb");
      expect(tokens.function).toContain("hsl");
      expect(tokens.function).toContain("oklch");
      expect(tokens.function).toContain("hex");
      expect(tokens.function).toContain("srgb");
      expect(tokens.function).toContain("lrgb");
    });

    it("should tokenize color manipulation functions", () => {
      const code = "lighten darken saturate desaturate spin mix";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.function).toBeDefined();
      expect(tokens.function).toContain("lighten");
      expect(tokens.function).toContain("darken");
      expect(tokens.function).toContain("saturate");
      expect(tokens.function).toContain("desaturate");
      expect(tokens.function).toContain("spin");
      expect(tokens.function).toContain("mix");
    });

    it("should tokenize utility functions", () => {
      const code = "round_to snap remap pow type";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.function).toBeDefined();
      expect(tokens.function).toContain("round_to");
      expect(tokens.function).toContain("snap");
      expect(tokens.function).toContain("remap");
      expect(tokens.function).toContain("pow");
      expect(tokens.function).toContain("type");
    });
  });

  describe("Operators", () => {
    it("should tokenize arithmetic operators", () => {
      const code = "+ - * / %";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.operator).toBeDefined();
      expect(tokens.operator).toContain("+");
      expect(tokens.operator).toContain("-");
      expect(tokens.operator).toContain("*");
      expect(tokens.operator).toContain("/");
      expect(tokens.operator).toContain("%");
    });

    it("should tokenize comparison operators", () => {
      const code = "== != < > <= >=";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.operator).toBeDefined();
      expect(tokens.operator).toContain("==");
      expect(tokens.operator).toContain("!=");
      expect(tokens.operator).toContain("<");
      expect(tokens.operator).toContain(">");
      expect(tokens.operator).toContain("<=");
      expect(tokens.operator).toContain(">=");
    });

    it("should tokenize logical operators", () => {
      const code = "&& || !";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.operator).toBeDefined();
      expect(tokens.operator).toContain("&&");
      expect(tokens.operator).toContain("||");
      expect(tokens.operator).toContain("!");
    });
  });

  describe("Methods and Properties", () => {
    it("should tokenize method calls", () => {
      const code = "color.lighten( object.getValue(";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.method).toBeDefined();
      expect(tokens.method.length).toBe(2);
    });

    it("should tokenize property access", () => {
      const code = "object.property another.value";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.property).toBeDefined();
      expect(tokens.property.length).toBe(2);
    });
  });

  describe("Complete Code Examples", () => {
    it("should correctly tokenize a variable declaration", () => {
      const code = 'variable myColor = "#ff0000"';
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toContain("variable");
      expect(tokens.string).toContain('"#ff0000"');
    });

    it("should correctly tokenize a color with unit", () => {
      const code = "variable spacing = 16px";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toContain("variable");
      expect(tokens["number-with-unit"]).toContain("16px");
    });

    it("should correctly tokenize a reference", () => {
      const code = "variable computed = {colors.primary}";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toContain("variable");
      expect(tokens.reference).toContain("{colors.primary}");
    });

    it("should correctly tokenize a function call", () => {
      const code = "rgb(255, 0, 0)";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.function).toContain("rgb");
      expect(tokens.number).toBeDefined();
      expect(tokens.number.length).toBeGreaterThanOrEqual(3);
    });

    it("should correctly tokenize if-else statement", () => {
      const code = "if (x > 5) { return true } else { return false }";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.keyword).toContain("if");
      expect(tokens.keyword).toContain("else");
      expect(tokens.keyword).toContain("return");
      expect(tokens.keyword).toContain("true");
      expect(tokens.keyword).toContain("false");
      expect(tokens.operator).toContain(">");
    });

    it("should correctly tokenize complex color manipulation", () => {
      const code = "lighten({colors.primary}, 10%)";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.function).toContain("lighten");
      expect(tokens.reference).toContain("{colors.primary}");
      expect(tokens["number-with-unit"]).toContain("10%");
    });

    it("should correctly tokenize a gradient", () => {
      const code = "linear-gradient(#ff0000, #00ff00)";
      const tokens = tokenizeWithPrism(code);

      expect(tokens.function).toContain("linear-gradient");
      expect(tokens["hex-color"]).toContain("#ff0000");
      expect(tokens["hex-color"]).toContain("#00ff00");
    });
  });

  describe("Pattern Consistency", () => {
    it("should use the same comment pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.comment.pattern).toBe(PATTERNS.comment);
    });

    it("should use the same string pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.string.pattern).toBe(PATTERNS.string);
    });

    it("should use the same reference pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.reference.pattern).toBe(PATTERNS.reference);
    });

    it("should use the same hexColor pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript["hex-color"].pattern).toBe(PATTERNS.hexColor);
    });

    it("should use the same numberWithUnit pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript["number-with-unit"].pattern).toBe(PATTERNS.numberWithUnit);
    });

    it("should use the same number pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.number.pattern).toBe(PATTERNS.number);
    });

    it("should use the same operator pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.operator).toBe(PATTERNS.operator);
    });

    it("should use the same punctuation pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.punctuation).toBe(PATTERNS.punctuation);
    });

    it("should use the same method pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.method.pattern).toBe(PATTERNS.method);
    });

    it("should use the same property pattern as spec", () => {
      const mockPrism = { languages: {} };
      tokenscriptLanguage(mockPrism);

      expect(mockPrism.languages.tokenscript.property.pattern).toBe(PATTERNS.property);
    });
  });
});
