import { BooleanSymbol, ColorSymbol, NullSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { LintSeverity } from "@src/processor/linter";
import type { ValidatorContext } from "@src/processor/linter/presets";
import { boolean, color, number, string, ValidatorCode } from "@src/processor/linter/presets";
import { describe, expect, it } from "vitest";

const ctx: ValidatorContext = {
  tokenName: "test.token",
  path: [],
  severity: LintSeverity.ERROR,
};

describe("Primitive Validators", () => {
  describe("number()", () => {
    it("should accept valid numbers", () => {
      expect(number()(new NumberSymbol(42), ctx)).toBeNull();
      expect(number()(new NumberSymbol(0), ctx)).toBeNull();
      expect(number()(new NumberSymbol(-10), ctx)).toBeNull();
      expect(number()(new NumberSymbol(3.14), ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      expect(number()(new NullSymbol(), ctx)).toBeNull();
    });

    it("should accept NumberSymbol with null value", () => {
      expect(number()(new NumberSymbol(null), ctx)).toBeNull();
    });

    it("should reject non-numbers", () => {
      const result = number()(new StringSymbol("42"), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.EXPECTED_NUMBER);
    });

    it("should validate min constraint", () => {
      const validator = number({ min: 0 });
      expect(validator(new NumberSymbol(0), ctx)).toBeNull();
      expect(validator(new NumberSymbol(10), ctx)).toBeNull();

      const result = validator(new NumberSymbol(-1), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
    });

    it("should validate max constraint", () => {
      const validator = number({ max: 100 });
      expect(validator(new NumberSymbol(100), ctx)).toBeNull();
      expect(validator(new NumberSymbol(50), ctx)).toBeNull();

      const result = validator(new NumberSymbol(101), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.VALUE_TOO_LARGE);
    });

    it("should validate min and max together", () => {
      const validator = number({ min: 0, max: 1 });
      expect(validator(new NumberSymbol(0), ctx)).toBeNull();
      expect(validator(new NumberSymbol(0.5), ctx)).toBeNull();
      expect(validator(new NumberSymbol(1), ctx)).toBeNull();

      expect(validator(new NumberSymbol(-0.1), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(validator(new NumberSymbol(1.1), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_LARGE);
    });
  });

  describe("string()", () => {
    it("should accept valid strings", () => {
      expect(string()(new StringSymbol("hello"), ctx)).toBeNull();
      expect(string()(new StringSymbol(""), ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      expect(string()(new NullSymbol(), ctx)).toBeNull();
    });

    it("should accept StringSymbol with null value", () => {
      expect(string()(new StringSymbol(null), ctx)).toBeNull();
    });

    it("should reject non-strings", () => {
      const result = string()(new NumberSymbol(42), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.EXPECTED_STRING);
    });

    it("should validate allowedValues (case-insensitive)", () => {
      const validator = string({ allowedValues: ["red", "green", "blue"] });
      expect(validator(new StringSymbol("red"), ctx)).toBeNull();
      expect(validator(new StringSymbol("RED"), ctx)).toBeNull();
      expect(validator(new StringSymbol("Green"), ctx)).toBeNull();

      const result = validator(new StringSymbol("yellow"), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });

    it("should validate allowedValues (case-sensitive)", () => {
      const validator = string({ allowedValues: ["Red", "Green"], caseSensitive: true });
      expect(validator(new StringSymbol("Red"), ctx)).toBeNull();
      expect(validator(new StringSymbol("Green"), ctx)).toBeNull();

      const result = validator(new StringSymbol("red"), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.VALUE_NOT_IN_ENUM);
    });
  });

  describe("boolean()", () => {
    it("should accept booleans", () => {
      expect(boolean()(new BooleanSymbol(true), ctx)).toBeNull();
      expect(boolean()(new BooleanSymbol(false), ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      expect(boolean()(new NullSymbol(), ctx)).toBeNull();
    });

    it("should accept BooleanSymbol with null value", () => {
      expect(boolean()(new BooleanSymbol(null), ctx)).toBeNull();
    });

    it("should reject non-booleans", () => {
      const result = boolean()(new StringSymbol("true"), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.EXPECTED_BOOLEAN);
    });
  });

  describe("color()", () => {
    it("should accept colors", () => {
      expect(color()(new ColorSymbol("#ff0000"), ctx)).toBeNull();
      expect(color()(new ColorSymbol("#000"), ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      expect(color()(new NullSymbol(), ctx)).toBeNull();
    });

    it("should accept ColorSymbol with null value", () => {
      expect(color()(new ColorSymbol(null), ctx)).toBeNull();
    });

    it("should reject non-colors", () => {
      const result = color()(new StringSymbol("#ff0000"), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.EXPECTED_COLOR);
    });
  });
});
