import { BooleanSymbol, ColorSymbol, ListSymbol, NumberSymbol, NumberWithUnitSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { LintSeverity } from "@src/processor/linter";
import type { ValidatorContext } from "@src/processor/linter/presets";
import { penpot, ValidatorCode } from "@src/processor/linter/presets";
import { describe, expect, it } from "vitest";

const ctx: ValidatorContext = {
  tokenName: "test.token",
  path: [],
  severity: LintSeverity.ERROR,
};

describe("Penpot Presets", () => {
  describe("strokeWidth", () => {
    it("should accept non-negative numbers", () => {
      expect(penpot.strokeWidth(new NumberSymbol(0), ctx)).toBeNull();
      expect(penpot.strokeWidth(new NumberSymbol(1), ctx)).toBeNull();
      expect(penpot.strokeWidth(new NumberSymbol(10), ctx)).toBeNull();
    });

    it("should accept non-negative dimensions", () => {
      expect(penpot.strokeWidth(new NumberWithUnitSymbol(0, "px"), ctx)).toBeNull();
      expect(penpot.strokeWidth(new NumberWithUnitSymbol(2, "px"), ctx)).toBeNull();
      expect(penpot.strokeWidth(new NumberWithUnitSymbol(0.5, "em"), ctx)).toBeNull();
    });

    it("should reject negative values", () => {
      expect(penpot.strokeWidth(new NumberSymbol(-1), ctx)?.code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
      expect(penpot.strokeWidth(new NumberWithUnitSymbol(-1, "px"), ctx)?.code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
    });

    it("should reject percentage", () => {
      expect(penpot.strokeWidth(new NumberWithUnitSymbol(10, "%"), ctx)?.code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
    });
  });

  describe("letterSpacing", () => {
    it("should accept plain numbers", () => {
      expect(penpot.letterSpacing(new NumberSymbol(0), ctx)).toBeNull();
      expect(penpot.letterSpacing(new NumberSymbol(2), ctx)).toBeNull();
      expect(penpot.letterSpacing(new NumberSymbol(-1), ctx)).toBeNull();
    });

    it("should accept dimensions (except %)", () => {
      expect(penpot.letterSpacing(new NumberWithUnitSymbol(0.1, "em"), ctx)).toBeNull();
      expect(penpot.letterSpacing(new NumberWithUnitSymbol(2, "px"), ctx)).toBeNull();
    });

    it("should reject percentage", () => {
      expect(penpot.letterSpacing(new NumberWithUnitSymbol(10, "%"), ctx)?.code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
    });
  });

  describe("textCase", () => {
    it("should accept Penpot text-case values", () => {
      expect(penpot.textCase(new StringSymbol("none"), ctx)).toBeNull();
      expect(penpot.textCase(new StringSymbol("uppercase"), ctx)).toBeNull();
      expect(penpot.textCase(new StringSymbol("lowercase"), ctx)).toBeNull();
      expect(penpot.textCase(new StringSymbol("capitalize"), ctx)).toBeNull();
    });

    it("should reject CSS-only values not in Penpot", () => {
      expect(penpot.textCase(new StringSymbol("full-width"), ctx)?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });
  });

  describe("textDecoration", () => {
    it("should accept Penpot text-decoration values", () => {
      expect(penpot.textDecoration(new StringSymbol("none"), ctx)).toBeNull();
      expect(penpot.textDecoration(new StringSymbol("underline"), ctx)).toBeNull();
      expect(penpot.textDecoration(new StringSymbol("line-through"), ctx)).toBeNull();
      expect(penpot.textDecoration(new StringSymbol("overline"), ctx)).toBeNull();
    });

    it("should reject CSS-only values not in Penpot", () => {
      expect(penpot.textDecoration(new StringSymbol("blink"), ctx)?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });
  });

  describe("fontSize", () => {
    it("should accept non-negative numbers", () => {
      expect(penpot.fontSize(new NumberSymbol(0), ctx)).toBeNull();
      expect(penpot.fontSize(new NumberSymbol(16), ctx)).toBeNull();
    });

    it("should accept non-negative dimensions", () => {
      expect(penpot.fontSize(new NumberWithUnitSymbol(16, "px"), ctx)).toBeNull();
      expect(penpot.fontSize(new NumberWithUnitSymbol(1, "em"), ctx)).toBeNull();
    });

    it("should reject negative values", () => {
      expect(penpot.fontSize(new NumberSymbol(-16), ctx)?.code).toBe(ValidatorCode.NO_VALIDATOR_MATCHED);
    });
  });

  describe("lineHeight (Penpot)", () => {
    it("should accept non-negative numbers (unitless multiplier)", () => {
      expect(penpot.lineHeight(new NumberSymbol(0), ctx)).toBeNull();
      expect(penpot.lineHeight(new NumberSymbol(1), ctx)).toBeNull();
      expect(penpot.lineHeight(new NumberSymbol(1.5), ctx)).toBeNull();
    });

    it("should reject dimensions (unlike CSS)", () => {
      expect(penpot.lineHeight(new NumberWithUnitSymbol(24, "px"), ctx)?.code).toBe(ValidatorCode.EXPECTED_NUMBER);
    });

    it("should reject negative values", () => {
      expect(penpot.lineHeight(new NumberSymbol(-1), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
    });
  });

  describe("typography", () => {
    it("should accept valid typography token", () => {
      const typography = new TokenSymbol(
        "typography",
        new Map([
          ["fontSize", new NumberWithUnitSymbol(16, "px")],
          ["fontFamily", new StringSymbol("Arial")],
          ["fontWeight", new NumberSymbol(400)],
          ["lineHeight", new NumberSymbol(1.5)],
          ["letterSpacing", new NumberSymbol(0)],
          ["textCase", new StringSymbol("none")],
          ["textDecoration", new StringSymbol("none")],
        ]),
      );
      expect(penpot.typography(typography, ctx)).toBeNull();
    });

    it("should accept partial typography token", () => {
      const typography = new TokenSymbol(
        "typography",
        new Map([
          ["fontSize", new NumberWithUnitSymbol(16, "px")],
          ["fontWeight", new StringSymbol("bold")],
        ]),
      );
      expect(penpot.typography(typography, ctx)).toBeNull();
    });

    it("should validate field values", () => {
      const typography = new TokenSymbol(
        "typography",
        new Map([
          ["fontSize", new NumberSymbol(-16)], // Invalid
          ["lineHeight", new NumberSymbol(1.5)],
        ]),
      );
      const result = penpot.typography(typography, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues.some((i) => i?.path?.[0] === "fontSize")).toBe(true);
    });
  });

  describe("shadow", () => {
    const createShadow = (blur: number, spread: number) =>
      new TokenSymbol(
        "shadow",
        new Map([
          ["offsetX", new NumberSymbol(0)],
          ["offsetY", new NumberSymbol(4)],
          ["blur", new NumberSymbol(blur)],
          ["spread", new NumberSymbol(spread)],
          ["color", new ColorSymbol("#000000")],
          ["inset", new BooleanSymbol(false)],
        ]),
      );

    it("should accept valid shadow", () => {
      const shadow = new ListSymbol([createShadow(8, 0)]);
      expect(penpot.shadow(shadow, ctx)).toBeNull();
    });

    it("should accept multiple shadows", () => {
      const shadows = new ListSymbol([createShadow(4, 0), createShadow(8, 2)]);
      expect(penpot.shadow(shadows, ctx)).toBeNull();
    });

    it("should reject negative blur (unlike CSS)", () => {
      const shadow = new ListSymbol([createShadow(-8, 0)]);
      const result = penpot.shadow(shadow, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues.some((i) => i?.path?.includes("blur"))).toBe(true);
    });

    it("should reject negative spread (unlike CSS)", () => {
      const shadow = new ListSymbol([createShadow(8, -2)]);
      const result = penpot.shadow(shadow, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues.some((i) => i?.path?.includes("spread"))).toBe(true);
    });

    it("should allow negative offsets", () => {
      const shadow = new ListSymbol([
        new TokenSymbol(
          "shadow",
          new Map([
            ["offsetX", new NumberSymbol(-10)],
            ["offsetY", new NumberSymbol(-10)],
            ["blur", new NumberSymbol(8)],
            ["spread", new NumberSymbol(0)],
            ["color", new ColorSymbol("#000000")],
            ["inset", new BooleanSymbol(false)],
          ]),
        ),
      ]);
      expect(penpot.shadow(shadow, ctx)).toBeNull();
    });
  });
});
