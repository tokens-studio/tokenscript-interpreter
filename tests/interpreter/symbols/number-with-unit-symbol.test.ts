import { describe, expect, it } from "vitest";
import { NumberWithUnitSymbol, NumberSymbol, StringSymbol } from "@src/interpreter/symbols";
import { InterpreterError } from "@src/interpreter/errors";
import { SupportedFormats } from "@src/types";

describe("NumberWithUnitSymbol", () => {
  describe("constructor", () => {
    it("should create from number and unit", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(numUnit.value).toBe(42);
      expect(numUnit.unit).toBe("px");
    });

    it("should create from NumberSymbol", () => {
      const num = new NumberSymbol(3.14);
      const numUnit = new NumberWithUnitSymbol(num, SupportedFormats.REM);
      expect(numUnit.value).toBe(3.14);
      expect(numUnit.unit).toBe("rem");
    });

    it("should create null value", () => {
      const numUnit = new NumberWithUnitSymbol(null, SupportedFormats.EM);
      expect(numUnit.value).toBe(null);
      expect(numUnit.unit).toBe("em");
    });

    it("should accept string unit", () => {
      const numUnit = new NumberWithUnitSymbol(10, "vh");
      expect(numUnit.value).toBe(10);
      expect(numUnit.unit).toBe("vh");
    });

    it("should throw error for invalid value type", () => {
      expect(() => new NumberWithUnitSymbol("invalid" as any, SupportedFormats.PX)).toThrow(InterpreterError);
    });

    it("should throw error for invalid unit", () => {
      expect(() => new NumberWithUnitSymbol(10, "invalid" as any)).toThrow(InterpreterError);
    });
  });

  describe("fromRecord", () => {
    it("should create from valid record", () => {
      const record = {
        value: 42,
        unit: "px",
        type: "NumberWithUnit"
      };
      const numUnit = NumberWithUnitSymbol.fromRecord(record);
      expect(numUnit?.value).toBe(42);
      expect(numUnit?.unit).toBe("px");
    });

    it("should return undefined for invalid record", () => {
      expect(NumberWithUnitSymbol.fromRecord(null)).toBeUndefined();
      expect(NumberWithUnitSymbol.fromRecord({ value: "invalid" })).toBeUndefined();
      expect(NumberWithUnitSymbol.fromRecord({ type: "String" })).toBeUndefined();
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy", () => {
      const original = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(42);
      expect(copy.unit).toBe("px");
    });

    it("should create a deep copy of null value", () => {
      const original = new NumberWithUnitSymbol(null, SupportedFormats.EM);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(null);
      expect(copy.unit).toBe("em");
    });
  });

  describe("toString", () => {
    it("should format value with unit", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(numUnit.toString()).toBe("42px");
    });

    it("should handle decimal values", () => {
      const numUnit = new NumberWithUnitSymbol(3.14, SupportedFormats.EM);
      expect(numUnit.toString()).toBe("3.14em");
    });

    it("should handle null value", () => {
      const numUnit = new NumberWithUnitSymbol(null, SupportedFormats.REM);
      expect(numUnit.toString()).toBe("nullrem");
    });
  });

  describe("toStringImpl", () => {
    it("should convert to StringSymbol", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      const result = numUnit.toStringImpl();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("42px");
    });

    it("should throw error for null value", () => {
      const numUnit = new NumberWithUnitSymbol(null, SupportedFormats.PX);
      expect(() => numUnit.toStringImpl()).toThrow(InterpreterError);
    });
  });

  describe("to_number", () => {
    it("should convert to NumberSymbol", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      const result = numUnit.to_number();
      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result.value).toBe(42);
    });

    it("should throw error for null value", () => {
      const numUnit = new NumberWithUnitSymbol(null, SupportedFormats.PX);
      expect(() => numUnit.to_number()).toThrow(InterpreterError);
    });
  });

  describe("validValue", () => {
    it("should validate NumberWithUnitSymbol values", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(numUnit.validValue(new NumberWithUnitSymbol(10, SupportedFormats.EM))).toBe(true);
      expect(numUnit.validValue(42)).toBe(false);
      expect(numUnit.validValue("42px")).toBe(false);
    });
  });

  describe("hasAttribute and getAttribute", () => {
    it("should support value attribute", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(numUnit.hasAttribute("value")).toBe(true);
      expect(numUnit.hasAttribute("unit")).toBe(false);

      const attr = numUnit.getAttribute("value");
      expect(attr?.value).toBe(42);
    });

    it("should throw error for unknown attributes", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(() => numUnit.getAttribute("unknown")).toThrow(InterpreterError);
    });
  });

  describe("getTypeName", () => {
    it("should return type name with unit", () => {
      const pxUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(pxUnit.getTypeName()).toBe("NumberWithUnit.Px");

      const emUnit = new NumberWithUnitSymbol(42, SupportedFormats.EM);
      expect(emUnit.getTypeName()).toBe("NumberWithUnit.Em");

      const remUnit = new NumberWithUnitSymbol(42, SupportedFormats.REM);
      expect(remUnit.getTypeName()).toBe("NumberWithUnit.Rem");
    });
  });

  describe("equals", () => {
    it("should compare values and units correctly", () => {
      const numUnit1 = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      const numUnit2 = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      const numUnit3 = new NumberWithUnitSymbol(42, SupportedFormats.EM);
      const numUnit4 = new NumberWithUnitSymbol(43, SupportedFormats.PX);

      expect(numUnit1.equals(numUnit2)).toBe(true);
      expect(numUnit1.equals(numUnit3)).toBe(false); // different units
      expect(numUnit1.equals(numUnit4)).toBe(false); // different values
    });
  });

  describe("expectSafeValue", () => {
    it("should not throw for valid values", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(() => numUnit.expectSafeValue(42)).not.toThrow();
      expect(() => numUnit.expectSafeValue(3.14)).not.toThrow();
    });

    it("should throw for null/undefined values", () => {
      const numUnit = new NumberWithUnitSymbol(42, SupportedFormats.PX);
      expect(() => numUnit.expectSafeValue(null)).toThrow(InterpreterError);
      expect(() => numUnit.expectSafeValue(undefined)).toThrow(InterpreterError);
    });
  });

  describe("static methods", () => {
    it("should create empty NumberWithUnitSymbol", () => {
      const empty = NumberWithUnitSymbol.empty();
      expect(empty.value).toBe(null);
      expect(empty.unit).toBe("px");
    });
  });
});