import { describe, expect, it } from "vitest";
import {
  BUILTIN_FUNCTIONS,
  KEYWORDS,
  MONACO_PATTERNS,
  OPERATORS,
  PATTERNS,
  TYPES,
  UNITS,
  createKeywordPattern,
  createUnitPattern,
} from "@src/syntax-highlighter/spec";

describe("Syntax Highlighter Spec", () => {
  describe("PATTERNS", () => {
    describe("comment", () => {
      it("should match single-line comments", () => {
        expect("// this is a comment").toMatch(PATTERNS.comment);
        expect("// comment with symbols !@#$%").toMatch(PATTERNS.comment);
      });

      it("should not match non-comments", () => {
        expect("not a comment").not.toMatch(PATTERNS.comment);
        expect("/ / spaced slashes").not.toMatch(PATTERNS.comment);
      });
    });

    describe("string", () => {
      it("should match double-quoted strings", () => {
        expect('"hello world"').toMatch(PATTERNS.string);
        expect('"string with \\"escaped\\" quotes"').toMatch(PATTERNS.string);
      });

      it("should match single-quoted strings", () => {
        expect("'hello world'").toMatch(PATTERNS.string);
        expect("'string with \\'escaped\\' quotes'").toMatch(PATTERNS.string);
      });

      it("should NOT match backtick strings (not supported in TokenScript)", () => {
        expect("`template string`").not.toMatch(PATTERNS.string);
      });

      it("should match strings with escape sequences", () => {
        expect('"line1\\nline2"').toMatch(PATTERNS.string);
        expect('"tab\\there"').toMatch(PATTERNS.string);
      });
    });

    describe("reference", () => {
      it("should match TokenScript references", () => {
        expect("{token.path}").toMatch(PATTERNS.reference);
        expect("{colors.primary}").toMatch(PATTERNS.reference);
        expect("{spacing.base.value}").toMatch(PATTERNS.reference);
      });

      it("should not match non-references", () => {
        expect("{}").not.toMatch(PATTERNS.reference);
        expect("plain text").not.toMatch(PATTERNS.reference);
      });
    });

    describe("hexColor", () => {
      it("should match 3-digit hex colors", () => {
        expect("#fff").toMatch(PATTERNS.hexColor);
        expect("#000").toMatch(PATTERNS.hexColor);
        expect("#abc").toMatch(PATTERNS.hexColor);
      });

      it("should match 6-digit hex colors", () => {
        expect("#ffffff").toMatch(PATTERNS.hexColor);
        expect("#000000").toMatch(PATTERNS.hexColor);
        expect("#ff0000").toMatch(PATTERNS.hexColor);
      });

      it("should match 8-digit hex colors (with alpha)", () => {
        expect("#ffffffff").toMatch(PATTERNS.hexColor);
        expect("#00000080").toMatch(PATTERNS.hexColor);
        expect("#ff0000ff").toMatch(PATTERNS.hexColor);
      });

      it("should be case insensitive", () => {
        expect("#FFF").toMatch(PATTERNS.hexColor);
        expect("#AbCdEf").toMatch(PATTERNS.hexColor);
        expect("#FFFFFFFF").toMatch(PATTERNS.hexColor);
      });

      it("should not match invalid hex colors", () => {
        expect("#ff").not.toMatch(PATTERNS.hexColor);
        expect("#ffff").not.toMatch(PATTERNS.hexColor);
        expect("#fffff").not.toMatch(PATTERNS.hexColor);
        expect("#gggggg").not.toMatch(PATTERNS.hexColor);
      });
    });

    describe("numberWithUnit", () => {
      it("should match integers with units", () => {
        expect("10px").toMatch(PATTERNS.numberWithUnit);
        expect("100%").toMatch(PATTERNS.numberWithUnit);
        expect("45deg").toMatch(PATTERNS.numberWithUnit);
      });

      it("should match floats with units", () => {
        expect("1.5em").toMatch(PATTERNS.numberWithUnit);
        expect("0.5rem").toMatch(PATTERNS.numberWithUnit);
        expect("90.5deg").toMatch(PATTERNS.numberWithUnit);
      });

      it("should match all supported units", () => {
        for (const unit of UNITS) {
          expect(`10${unit}`).toMatch(PATTERNS.numberWithUnit);
          expect(`1.5${unit}`).toMatch(PATTERNS.numberWithUnit);
        }
      });

      it("should not match numbers without units", () => {
        expect("10").not.toMatch(PATTERNS.numberWithUnit);
        expect("1.5").not.toMatch(PATTERNS.numberWithUnit);
      });
    });

    describe("number", () => {
      it("should match integers", () => {
        expect("123").toMatch(PATTERNS.number);
        expect("0").toMatch(PATTERNS.number);
      });

      it("should match floats", () => {
        expect("123.456").toMatch(PATTERNS.number);
        expect("0.5").toMatch(PATTERNS.number);
      });

      it("should match scientific notation", () => {
        expect("1e10").toMatch(PATTERNS.number);
        expect("1.5e-10").toMatch(PATTERNS.number);
        expect("2E+5").toMatch(PATTERNS.number);
      });

      it("should not match non-numbers", () => {
        expect("abc").not.toMatch(PATTERNS.number);
        expect("").not.toMatch(PATTERNS.number);
      });
    });

    describe("float", () => {
      it("should match floats with decimal point", () => {
        expect("0.5").toMatch(PATTERNS.float);
        expect("123.456").toMatch(PATTERNS.float);
        expect(".5").toMatch(PATTERNS.float);
      });

      it("should match floats with scientific notation", () => {
        expect("1.5e10").toMatch(PATTERNS.float);
        expect("0.5e-10").toMatch(PATTERNS.float);
        expect(".5E+5").toMatch(PATTERNS.float);
      });

      it("should not match integers without decimal", () => {
        expect("123").not.toMatch(PATTERNS.float);
        expect("0").not.toMatch(PATTERNS.float);
      });
    });

    describe("identifier", () => {
      it("should match valid identifiers", () => {
        expect("variableName").toMatch(PATTERNS.identifier);
        expect("_privateVar").toMatch(PATTERNS.identifier);
        expect("$jquery").toMatch(PATTERNS.identifier);
        expect("camelCase123").toMatch(PATTERNS.identifier);
      });

      it("should not match identifiers starting with numbers", () => {
        const match = "123abc".match(PATTERNS.identifier);
        expect(match?.[0]).not.toBe("123abc");
      });
    });

    describe("operator", () => {
      it("should match arithmetic operators", () => {
        expect("+").toMatch(PATTERNS.operator);
        expect("-").toMatch(PATTERNS.operator);
        expect("*").toMatch(PATTERNS.operator);
        expect("/").toMatch(PATTERNS.operator);
        expect("%").toMatch(PATTERNS.operator);
      });

      it("should match comparison operators", () => {
        expect("==").toMatch(PATTERNS.operator);
        expect("!=").toMatch(PATTERNS.operator);
        expect("<").toMatch(PATTERNS.operator);
        expect(">").toMatch(PATTERNS.operator);
        expect("<=").toMatch(PATTERNS.operator);
        expect(">=").toMatch(PATTERNS.operator);
      });

      it("should match logical operators", () => {
        expect("&&").toMatch(PATTERNS.operator);
        expect("||").toMatch(PATTERNS.operator);
        expect("!").toMatch(PATTERNS.operator);
      });

      it("should match assignment operators", () => {
        expect("=").toMatch(PATTERNS.operator);
        expect("+=").toMatch(PATTERNS.operator);
        expect("-=").toMatch(PATTERNS.operator);
      });
    });

    describe("punctuation", () => {
      it("should match brackets", () => {
        expect("[").toMatch(PATTERNS.punctuation);
        expect("]").toMatch(PATTERNS.punctuation);
        expect("(").toMatch(PATTERNS.punctuation);
        expect(")").toMatch(PATTERNS.punctuation);
      });

      it("should NOT match curly braces (not used in TokenScript)", () => {
        expect("{").not.toMatch(PATTERNS.punctuation);
        expect("}").not.toMatch(PATTERNS.punctuation);
      });

      it("should match delimiters", () => {
        expect(";").toMatch(PATTERNS.punctuation);
        expect(",").toMatch(PATTERNS.punctuation);
        expect(".").toMatch(PATTERNS.punctuation);
        expect(":").toMatch(PATTERNS.punctuation);
      });
    });

    describe("method", () => {
      it("should match method calls", () => {
        expect(".toString(").toMatch(PATTERNS.method);
        expect(".getValue(").toMatch(PATTERNS.method);
      });

      it("should not match properties without parentheses", () => {
        expect(".property").not.toMatch(PATTERNS.method);
      });
    });

    describe("property", () => {
      it("should match property access", () => {
        expect(".property").toMatch(PATTERNS.property);
        expect(".value").toMatch(PATTERNS.property);
      });

      it("should not match method calls", () => {
        expect(".method(").not.toMatch(PATTERNS.property);
      });
    });

    describe("colorType", () => {
      it("should match Color base type", () => {
        expect("Color").toMatch(PATTERNS.colorType);
      });

      it("should match standard Color subtypes", () => {
        expect("Color.Hex").toMatch(PATTERNS.colorType);
        expect("Color.Rgb").toMatch(PATTERNS.colorType);
        expect("Color.Rgba").toMatch(PATTERNS.colorType);
        expect("Color.Hsl").toMatch(PATTERNS.colorType);
        expect("Color.Hsla").toMatch(PATTERNS.colorType);
        expect("Color.Srgb").toMatch(PATTERNS.colorType);
        expect("Color.Lrgb").toMatch(PATTERNS.colorType);
        expect("Color.Oklch").toMatch(PATTERNS.colorType);
      });

      it("should match any arbitrary Color subtype", () => {
        expect("Color.AnythingHere").toMatch(PATTERNS.colorType);
        expect("Color.Custom123").toMatch(PATTERNS.colorType);
        expect("Color.Whatever_Works").toMatch(PATTERNS.colorType);
        expect("Color.NewColorSpace").toMatch(PATTERNS.colorType);
      });

      it("should use word boundaries", () => {
        const match = "Color.Hex something".match(PATTERNS.colorType);
        expect(match?.[0]).toBe("Color.Hex");
      });

      it("should not match non-Color types", () => {
        expect("String").not.toMatch(PATTERNS.colorType);
        expect("Number").not.toMatch(PATTERNS.colorType);
        expect("ColorFoo").not.toMatch(PATTERNS.colorType);
        expect("MyColor").not.toMatch(PATTERNS.colorType);
      });
    });
  });

  describe("MONACO_PATTERNS", () => {
    describe("stringInvalidDouble", () => {
      it("should match unterminated double-quoted strings at end of line", () => {
        expect('"unterminated string').toMatch(MONACO_PATTERNS.stringInvalidDouble);
        expect('"string with \\"escape').toMatch(MONACO_PATTERNS.stringInvalidDouble);
      });

      it("should match strings ending at line end (for Monaco state tracking)", () => {
        expect('"terminated"').toMatch(MONACO_PATTERNS.stringInvalidDouble);
      });

      it("should not match single-quoted strings", () => {
        expect("'unterminated").not.toMatch(MONACO_PATTERNS.stringInvalidDouble);
      });
    });

    describe("stringInvalidSingle", () => {
      it("should match unterminated single-quoted strings at end of line", () => {
        expect("'unterminated string").toMatch(MONACO_PATTERNS.stringInvalidSingle);
        expect("'string with \\'escape").toMatch(MONACO_PATTERNS.stringInvalidSingle);
      });

      it("should match strings ending at line end (for Monaco state tracking)", () => {
        expect("'terminated'").toMatch(MONACO_PATTERNS.stringInvalidSingle);
      });

      it("should not match double-quoted strings", () => {
        expect('"unterminated').not.toMatch(MONACO_PATTERNS.stringInvalidSingle);
      });
    });

    describe("stringStartDouble", () => {
      it("should match double quote character", () => {
        expect('"').toMatch(MONACO_PATTERNS.stringStartDouble);
        expect('"hello').toMatch(MONACO_PATTERNS.stringStartDouble);
      });

      it("should not match single quote", () => {
        expect("'").not.toMatch(MONACO_PATTERNS.stringStartDouble);
      });
    });

    describe("stringStartSingle", () => {
      it("should match single quote character", () => {
        expect("'").toMatch(MONACO_PATTERNS.stringStartSingle);
        expect("'hello").toMatch(MONACO_PATTERNS.stringStartSingle);
      });

      it("should not match double quote", () => {
        expect('"').not.toMatch(MONACO_PATTERNS.stringStartSingle);
      });
    });

    describe("numberWithDynamicUnit", () => {
      it("should match integers with units", () => {
        expect("10px").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
        expect("45deg").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
      });

      it("should match floats with units", () => {
        expect("1.5em").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
        expect("0.5rem").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
        expect("90.5deg").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
      });

      it("should capture unit in group", () => {
        const match = "10px".match(MONACO_PATTERNS.numberWithDynamicUnit);
        expect(match?.[2]).toBe("px");
      });

      it("should match any alphabetic unit", () => {
        expect("10xyz").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
        expect("5.5abc").toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
      });

      it("should not match percentage due to word boundary requirement", () => {
        // The pattern uses \b which requires word character boundaries
        // % is not a word character, so 100% doesn't match
        expect("100%").not.toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
      });

      it("should not match numbers without units", () => {
        expect("10").not.toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
        expect("1.5").not.toMatch(MONACO_PATTERNS.numberWithDynamicUnit);
      });
    });
  });

  describe("Constants", () => {
    describe("KEYWORDS", () => {
      it("should include control flow keywords", () => {
        expect(KEYWORDS).toContain("if");
        expect(KEYWORDS).toContain("else");
        expect(KEYWORDS).toContain("elif");
        expect(KEYWORDS).toContain("while");
        expect(KEYWORDS).toContain("return");
      });

      it("should include value keywords", () => {
        expect(KEYWORDS).toContain("true");
        expect(KEYWORDS).toContain("false");
        expect(KEYWORDS).toContain("null");
        expect(KEYWORDS).toContain("undefined");
      });

      it("should include variable declaration", () => {
        expect(KEYWORDS).toContain("variable");
      });
    });

    describe("TYPES", () => {
      it("should include primitive types", () => {
        expect(TYPES).toContain("String");
        expect(TYPES).toContain("Number");
        expect(TYPES).toContain("Boolean");
      });

      it("should include complex types", () => {
        expect(TYPES).toContain("NumberWithUnit");
        expect(TYPES).toContain("Color");
        expect(TYPES).toContain("List");
        expect(TYPES).toContain("Dictionary");
      });
    });

    describe("BUILTIN_FUNCTIONS", () => {
      it("should include color functions", () => {
        expect(BUILTIN_FUNCTIONS).toContain("rgb");
        expect(BUILTIN_FUNCTIONS).toContain("rgba");
        expect(BUILTIN_FUNCTIONS).toContain("hsl");
        expect(BUILTIN_FUNCTIONS).toContain("hsla");
        expect(BUILTIN_FUNCTIONS).toContain("hex");
        expect(BUILTIN_FUNCTIONS).toContain("oklch");
      });

      it("should include color manipulation functions", () => {
        expect(BUILTIN_FUNCTIONS).toContain("lighten");
        expect(BUILTIN_FUNCTIONS).toContain("darken");
        expect(BUILTIN_FUNCTIONS).toContain("saturate");
        expect(BUILTIN_FUNCTIONS).toContain("desaturate");
        expect(BUILTIN_FUNCTIONS).toContain("spin");
        expect(BUILTIN_FUNCTIONS).toContain("mix");
      });

      it("should include utility functions", () => {
        expect(BUILTIN_FUNCTIONS).toContain("round_to");
        expect(BUILTIN_FUNCTIONS).toContain("snap");
        expect(BUILTIN_FUNCTIONS).toContain("remap");
        expect(BUILTIN_FUNCTIONS).toContain("pow");
        expect(BUILTIN_FUNCTIONS).toContain("type");
      });
    });

    describe("UNITS", () => {
      it("should include length units", () => {
        expect(UNITS).toContain("px");
        expect(UNITS).toContain("em");
        expect(UNITS).toContain("rem");
        expect(UNITS).toContain("pt");
        expect(UNITS).toContain("in");
        expect(UNITS).toContain("cm");
        expect(UNITS).toContain("mm");
      });

      it("should include viewport units", () => {
        expect(UNITS).toContain("vh");
        expect(UNITS).toContain("vw");
      });

      it("should include angle units", () => {
        expect(UNITS).toContain("deg");
      });

      it("should include percentage", () => {
        expect(UNITS).toContain("%");
      });
    });

    describe("OPERATORS", () => {
      it("should include arithmetic operators", () => {
        expect(OPERATORS).toContain("+");
        expect(OPERATORS).toContain("-");
        expect(OPERATORS).toContain("*");
        expect(OPERATORS).toContain("/");
        expect(OPERATORS).toContain("^");
      });

      it("should include comparison operators", () => {
        expect(OPERATORS).toContain("==");
        expect(OPERATORS).toContain("!=");
        expect(OPERATORS).toContain("<");
        expect(OPERATORS).toContain(">");
        expect(OPERATORS).toContain("<=");
        expect(OPERATORS).toContain(">=");
      });

      it("should include logical operators", () => {
        expect(OPERATORS).toContain("&&");
        expect(OPERATORS).toContain("||");
        expect(OPERATORS).toContain("!");
      });

      it("should include assignment and colon operators", () => {
        expect(OPERATORS).toContain("=");
        expect(OPERATORS).toContain(":");
      });
    });
  });

  describe("Helper Functions", () => {
    describe("createKeywordPattern", () => {
      it("should create a regex that matches keywords", () => {
        const pattern = createKeywordPattern(["foo", "bar", "baz"]);
        expect("foo").toMatch(pattern);
        expect("bar").toMatch(pattern);
        expect("baz").toMatch(pattern);
      });

      it("should use word boundaries", () => {
        const pattern = createKeywordPattern(["if"]);
        expect("if").toMatch(pattern);
        expect("if ").toMatch(pattern);
        expect(" if ").toMatch(pattern);
        expect("iffy").not.toMatch(pattern);
      });

      it("should work with actual keywords", () => {
        const pattern = createKeywordPattern(KEYWORDS);
        expect("variable").toMatch(pattern);
        expect("if").toMatch(pattern);
        expect("return").toMatch(pattern);
        expect("notakeyword").not.toMatch(pattern);
      });
    });

    describe("createUnitPattern", () => {
      it("should create a regex that matches numbers with units", () => {
        const pattern = createUnitPattern(["px", "em"]);
        expect("10px").toMatch(pattern);
        expect("1.5em").toMatch(pattern);
      });

      it("should escape special regex characters", () => {
        const pattern = createUnitPattern(["%", "px"]);
        expect("100%").toMatch(pattern);
        expect("10px").toMatch(pattern);
      });

      it("should work with actual units", () => {
        const pattern = createUnitPattern(UNITS);
        expect("10px").toMatch(pattern);
        expect("1.5em").toMatch(pattern);
        expect("100%").toMatch(pattern);
        expect("45deg").toMatch(pattern);
      });
    });
  });
});
