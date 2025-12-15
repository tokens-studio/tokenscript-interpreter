import { BooleanSymbol, ColorSymbol, ListSymbol, NullSymbol, NumberSymbol, NumberWithUnitSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { LintSeverity } from "@src/processor/linter";
import type { ValidatorContext } from "@src/processor/linter/presets";
import { css, ValidatorCode } from "@src/processor/linter/presets";
import { describe, expect, it } from "vitest";

const ctx: ValidatorContext = {
  tokenName: "test.token",
  path: [],
  severity: LintSeverity.ERROR,
};

describe("CSS Presets", () => {
  describe("opacity", () => {
    it("should accept values 0-1", () => {
      expect(css.opacity(new NumberSymbol(0), ctx)).toBeNull();
      expect(css.opacity(new NumberSymbol(0.5), ctx)).toBeNull();
      expect(css.opacity(new NumberSymbol(1), ctx)).toBeNull();
    });

    it("should accept null", () => {
      expect(css.opacity(new NullSymbol(), ctx)).toBeNull();
    });

    it("should reject out of range", () => {
      expect(css.opacity(new NumberSymbol(-0.1), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(css.opacity(new NumberSymbol(1.1), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_LARGE);
    });
  });

  describe("fontWeight", () => {
    it("should accept numeric values 1-1000", () => {
      expect(css.fontWeight(new NumberSymbol(1), ctx)).toBeNull();
      expect(css.fontWeight(new NumberSymbol(400), ctx)).toBeNull();
      expect(css.fontWeight(new NumberSymbol(700), ctx)).toBeNull();
      expect(css.fontWeight(new NumberSymbol(1000), ctx)).toBeNull();
    });

    it("should accept keyword values", () => {
      expect(css.fontWeight(new StringSymbol("normal"), ctx)).toBeNull();
      expect(css.fontWeight(new StringSymbol("bold"), ctx)).toBeNull();
      expect(css.fontWeight(new StringSymbol("lighter"), ctx)).toBeNull();
      expect(css.fontWeight(new StringSymbol("bolder"), ctx)).toBeNull();
    });

    it("should be case-insensitive for keywords", () => {
      expect(css.fontWeight(new StringSymbol("BOLD"), ctx)).toBeNull();
      expect(css.fontWeight(new StringSymbol("Normal"), ctx)).toBeNull();
    });

    it("should reject invalid values", () => {
      expect(css.fontWeight(new NumberSymbol(0), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(css.fontWeight(new NumberSymbol(1001), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_LARGE);
      expect(css.fontWeight(new StringSymbol("invalid"), ctx)?.code).toBe(ValidatorCode.EXPECTED_NUMBER);
    });
  });

  describe("fontFamily", () => {
    it("should accept single string", () => {
      expect(css.fontFamily(new StringSymbol("Arial"), ctx)).toBeNull();
      expect(css.fontFamily(new StringSymbol("Helvetica Neue"), ctx)).toBeNull();
    });

    it("should accept list of strings (font stack)", () => {
      const fontStack = new ListSymbol([new StringSymbol("Helvetica"), new StringSymbol("Arial"), new StringSymbol("sans-serif")]);
      expect(css.fontFamily(fontStack, ctx)).toBeNull();
    });

    it("should reject empty list", () => {
      const emptyList = new ListSymbol([]);
      expect(css.fontFamily(emptyList, ctx)?.code).toBe(ValidatorCode.EXPECTED_STRING);
    });
  });

  describe("textTransform", () => {
    it("should accept valid values", () => {
      expect(css.textTransform(new StringSymbol("none"), ctx)).toBeNull();
      expect(css.textTransform(new StringSymbol("uppercase"), ctx)).toBeNull();
      expect(css.textTransform(new StringSymbol("lowercase"), ctx)).toBeNull();
      expect(css.textTransform(new StringSymbol("capitalize"), ctx)).toBeNull();
    });

    it("should reject invalid values", () => {
      expect(css.textTransform(new StringSymbol("invalid"), ctx)?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });
  });

  describe("textDecorationLine", () => {
    it("should accept valid values", () => {
      expect(css.textDecorationLine(new StringSymbol("none"), ctx)).toBeNull();
      expect(css.textDecorationLine(new StringSymbol("underline"), ctx)).toBeNull();
      expect(css.textDecorationLine(new StringSymbol("overline"), ctx)).toBeNull();
      expect(css.textDecorationLine(new StringSymbol("line-through"), ctx)).toBeNull();
    });

    it("should reject invalid values", () => {
      expect(css.textDecorationLine(new StringSymbol("invalid"), ctx)?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });
  });

  describe("length", () => {
    it("should accept unitless 0", () => {
      expect(css.length(new NumberSymbol(0), ctx)).toBeNull();
    });

    it("should accept length with valid units", () => {
      expect(css.length(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
      expect(css.length(new NumberWithUnitSymbol(1.5, "em"), ctx)).toBeNull();
      expect(css.length(new NumberWithUnitSymbol(2, "rem"), ctx)).toBeNull();
      expect(css.length(new NumberWithUnitSymbol(100, "vw"), ctx)).toBeNull();
    });

    it("should reject non-zero unitless values", () => {
      expect(css.length(new NumberSymbol(10), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_LARGE);
    });

    it("should reject percentage", () => {
      expect(css.length(new NumberWithUnitSymbol(50, "%"), ctx)?.code).toBe(ValidatorCode.EXPECTED_NUMBER);
    });
  });

  describe("lengthPercentage", () => {
    it("should accept length values", () => {
      expect(css.lengthPercentage(new NumberSymbol(0), ctx)).toBeNull();
      expect(css.lengthPercentage(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
    });

    it("should accept percentage values", () => {
      expect(css.lengthPercentage(new NumberWithUnitSymbol(50, "%"), ctx)).toBeNull();
      expect(css.lengthPercentage(new NumberWithUnitSymbol(100, "%"), ctx)).toBeNull();
    });
  });

  describe("borderRadius", () => {
    it("should accept single value", () => {
      expect(css.borderRadius(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
      expect(css.borderRadius(new NumberWithUnitSymbol(50, "%"), ctx)).toBeNull();
    });

    it("should accept 1, 2, 3, or 4 values", () => {
      const one = new ListSymbol([new NumberWithUnitSymbol(10, "px")]);
      const two = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberWithUnitSymbol(20, "px")]);
      const three = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberWithUnitSymbol(20, "px"), new NumberWithUnitSymbol(30, "px")]);
      const four = new ListSymbol([
        new NumberWithUnitSymbol(10, "px"),
        new NumberWithUnitSymbol(20, "px"),
        new NumberWithUnitSymbol(30, "px"),
        new NumberWithUnitSymbol(40, "px"),
      ]);

      expect(css.borderRadius(one, ctx)).toBeNull();
      expect(css.borderRadius(two, ctx)).toBeNull();
      expect(css.borderRadius(three, ctx)).toBeNull();
      expect(css.borderRadius(four, ctx)).toBeNull();
    });

    it("should reject 5 values", () => {
      const five = new ListSymbol([
        new NumberWithUnitSymbol(10, "px"),
        new NumberWithUnitSymbol(20, "px"),
        new NumberWithUnitSymbol(30, "px"),
        new NumberWithUnitSymbol(40, "px"),
        new NumberWithUnitSymbol(50, "px"),
      ]);
      expect(css.borderRadius(five, ctx)?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });

    it("should reject negative values", () => {
      expect(css.borderRadius(new NumberWithUnitSymbol(-10, "px"), ctx)?.code).toBe(ValidatorCode.EXPECTED_NUMBER);
    });
  });

  describe("letterSpacing", () => {
    it("should accept 'normal' keyword", () => {
      expect(css.letterSpacing(new StringSymbol("normal"), ctx)).toBeNull();
    });

    it("should accept length values", () => {
      expect(css.letterSpacing(new NumberSymbol(0), ctx)).toBeNull();
      expect(css.letterSpacing(new NumberWithUnitSymbol(0.1, "em"), ctx)).toBeNull();
      expect(css.letterSpacing(new NumberWithUnitSymbol(2, "px"), ctx)).toBeNull();
    });

    it("should reject percentage", () => {
      expect(css.letterSpacing(new NumberWithUnitSymbol(10, "%"), ctx)?.code).toBe(ValidatorCode.EXPECTED_STRING);
    });
  });

  describe("lineHeight", () => {
    it("should accept 'normal' keyword", () => {
      expect(css.lineHeight(new StringSymbol("normal"), ctx)).toBeNull();
    });

    it("should accept unitless number (multiplier)", () => {
      expect(css.lineHeight(new NumberSymbol(1.5), ctx)).toBeNull();
      expect(css.lineHeight(new NumberSymbol(2), ctx)).toBeNull();
    });

    it("should accept length values", () => {
      expect(css.lineHeight(new NumberWithUnitSymbol(24, "px"), ctx)).toBeNull();
      expect(css.lineHeight(new NumberWithUnitSymbol(1.5, "em"), ctx)).toBeNull();
    });

    it("should accept percentage", () => {
      expect(css.lineHeight(new NumberWithUnitSymbol(150, "%"), ctx)).toBeNull();
    });

    it("should reject negative values", () => {
      expect(css.lineHeight(new NumberSymbol(-1), ctx)?.code).toBe(ValidatorCode.EXPECTED_STRING);
    });
  });

  describe("boxShadow", () => {
    it("should accept single shadow", () => {
      const shadow = new ListSymbol([
        new TokenSymbol(
          "shadow",
          new Map([
            ["offsetX", new NumberWithUnitSymbol(0, "px")],
            ["offsetY", new NumberWithUnitSymbol(4, "px")],
            ["blur", new NumberWithUnitSymbol(8, "px")],
            ["spread", new NumberWithUnitSymbol(0, "px")],
            ["color", new ColorSymbol("#000000")],
            ["inset", new BooleanSymbol(false)],
          ]),
        ),
      ]);
      expect(css.boxShadow(shadow, ctx)).toBeNull();
    });

    it("should accept multiple shadows", () => {
      const shadows = new ListSymbol([
        new TokenSymbol(
          "shadow",
          new Map([
            ["offsetX", new NumberWithUnitSymbol(0, "px")],
            ["offsetY", new NumberWithUnitSymbol(2, "px")],
            ["blur", new NumberWithUnitSymbol(4, "px")],
            ["spread", new NumberWithUnitSymbol(0, "px")],
            ["color", new ColorSymbol("#000000")],
            ["inset", new BooleanSymbol(false)],
          ]),
        ),
        new TokenSymbol(
          "shadow",
          new Map([
            ["offsetX", new NumberWithUnitSymbol(0, "px")],
            ["offsetY", new NumberWithUnitSymbol(4, "px")],
            ["blur", new NumberWithUnitSymbol(8, "px")],
            ["spread", new NumberWithUnitSymbol(0, "px")],
            ["color", new ColorSymbol("#333333")],
            ["inset", new BooleanSymbol(true)],
          ]),
        ),
      ]);
      expect(css.boxShadow(shadows, ctx)).toBeNull();
    });

    it("should reject empty shadow list", () => {
      const empty = new ListSymbol([]);
      expect(css.boxShadow(empty, ctx)?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });
  });
});
