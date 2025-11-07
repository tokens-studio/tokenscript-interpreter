import { describe, expect, it } from "vitest";
import { createInterpreter, interpret } from "../test-helpers";
import { Config } from "@interpreter/config/config";
import { UnitManager } from "@interpreter/config/managers/unit/manager";

describe("Unit Manager", () => {
  describe("Basic Unit Operations", () => {
    it("should handle basic arithmetic with same units", () => {
      const result = interpret("10px + 5px");
      expect(result).toBe("15px");
    });

    it("should handle subtraction with same units", () => {
      const result = interpret("20px - 5px");
      expect(result).toBe("15px");
    });

    it("should handle multiplication with units", () => {
      const result = interpret("10px * 2");
      expect(result).toBe("20px");
    });

    it("should handle division with units", () => {
      const result = interpret("20px / 4");
      expect(result).toBe("5px");
    });
  });

  describe("Absolute Unit Conversion", () => {
    it("should convert rem to px", () => {
      const result = interpret("10px + 1rem");
      expect(result).toBe("26px");
    });

    it("should convert px to rem when rem has higher absolute value", () => {
      const result = interpret("1rem + 10px");
      expect(result).toBe("26px");
    });

    it("should handle complex absolute conversions", () => {
      const result = interpret("1rem + 5px + 0.5rem");
      expect(result).toBe("29px");
    });
  });

  describe("Relative Unit Resolution", () => {
    it("should resolve percentage with pixels", () => {
      const result = interpret("10px + 10%");
      expect(result).toBe("11px");
    });

    it("should resolve percentage with rem", () => {
      const result = interpret("1rem + 10%");
      expect(result).toBe("1.1rem");
    });

    it("should resolve percentage with unitless numbers", () => {
      const result = interpret("10 + 10%");
      expect(result).toBe("11");
    });

    it("should handle complex relative operations", () => {
      const result = interpret("10px + 10% + 20px");
      expect(result).toBe("31px");
    });

    it("should handle percentage multiplication", () => {
      const result = interpret("10rem * 10%");
      expect(result).toBe("1rem");
    });

    it("should handle percentage division", () => {
      const result = interpret("10px / 50%");
      expect(result).toBe("20px");
    });

    it("should handle percentage with unitless multiplication", () => {
      const result = interpret("100 * 25%");
      expect(result).toBe("25");
    });
  });

  describe("Sum Function with Units", () => {
    it("should sum numbers without units", () => {
      const result = interpret("sum(10, 5, 3)");
      expect(result).toBe("18");
    });

    it("should sum same units", () => {
      const result = interpret("sum(10px, 5px, 3px)");
      expect(result).toBe("18px");
    });

    it("should sum mixed absolute units", () => {
      const result = interpret("sum(10px, 1rem)");
      expect(result).toBe("26px");
    });

    it("should sum with unitless and units", () => {
      const result = interpret("sum(10px, 5)");
      expect(result).toBe("15px");
    });

    it("should handle complex sum with conversions", () => {
      const result = interpret("sum(10px, 10, 1rem)");
      expect(result).toBe("36px");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for multiple relative units in sum", () => {
      expect(() => {
        const interpreter = createInterpreter("sum(10px, 10%, 1rem)");
        interpreter.interpret();
      }).toThrow("Cannot convert multiple relative units");
    });

    it("should throw error for unsupported unit combinations", () => {
      expect(() => {
        const interpreter = createInterpreter("10s + 10px");
        interpreter.interpret();
      }).toThrow();
    });
  });

  describe("Unit Specifications", () => {
    it("should recognize pixel units", () => {
      const unitManager = new UnitManager();
      const spec = unitManager.getSpecByKeyword("px");
      expect(spec?.name).toBe("pixel");
      expect(spec?.type).toBe("absolute");
    });

    it("should recognize rem units", () => {
      const unitManager = new UnitManager();
      const spec = unitManager.getSpecByKeyword("rem");
      expect(spec?.name).toBe("root em");
      expect(spec?.type).toBe("absolute");
    });

    it("should recognize percentage units", () => {
      const unitManager = new UnitManager();
      const spec = unitManager.getSpecByKeyword("%");
      expect(spec?.name).toBe("percent");
      expect(spec?.type).toBe("relative");
    });

    it("should recognize seconds units", () => {
      const unitManager = new UnitManager();
      const spec = unitManager.getSpecByKeyword("s");
      expect(spec?.name).toBe("seconds");
      expect(spec?.type).toBe("absolute");
    });
  });
});
