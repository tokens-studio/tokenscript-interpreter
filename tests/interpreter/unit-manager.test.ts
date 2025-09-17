import { describe, expect, it } from "vitest";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";
import { Interpreter } from "../../interpreter/interpreter";
import { Config } from "../../interpreter/config/config";
import { UnitManager } from "../../interpreter/config/managers/unit/manager";

function interpretExpression(text: string, config?: Config): any {
  const lexer = new Lexer(text);
  const parser = new Parser(lexer);
  const ast = parser.parse();
  
  if (!config) {
    config = new Config({});
  }
  
  const interpreter = new Interpreter(ast, { config });
  return interpreter.interpret();
}

describe("Unit Manager", () => {
  describe("Basic Unit Operations", () => {
    it("should handle basic arithmetic with same units", () => {
      const result = interpretExpression("10px + 5px");
      expect(result.toString()).toBe("15px");
    });

    it("should handle subtraction with same units", () => {
      const result = interpretExpression("20px - 5px");
      expect(result.toString()).toBe("15px");
    });

    it("should handle multiplication with units", () => {
      const result = interpretExpression("10px * 2");
      expect(result.toString()).toBe("20px");
    });

    it("should handle division with units", () => {
      const result = interpretExpression("20px / 4");
      expect(result.toString()).toBe("5px");
    });
  });

  describe("Absolute Unit Conversion", () => {
    it("should convert rem to px", () => {
      const result = interpretExpression("10px + 1rem");
      expect(result.toString()).toBe("26px"); // 10px + (1rem * 16px/rem) = 26px
    });

    it("should convert px to rem when rem has higher absolute value", () => {
      const result = interpretExpression("1rem + 10px");
      expect(result.toString()).toBe("26px"); // Should convert to px since 16 > 10
    });

    it("should handle complex absolute conversions", () => {
      const result = interpretExpression("1rem + 5px + 0.5rem");
      // 1rem = 16px, 0.5rem = 8px, so 16px + 5px + 8px = 29px
      expect(result.toString()).toBe("29px");
    });
  });

  describe("Relative Unit Resolution", () => {
    it("should resolve percentage with pixels", () => {
      const result = interpretExpression("10px + 10%");
      // 10px + (10% of 10px) = 10px + 1px = 11px
      expect(result.toString()).toBe("11px");
    });

    it("should resolve percentage with rem", () => {
      const result = interpretExpression("1rem + 10%");
      // 1rem + (10% of 1rem) = 1rem + 0.1rem = 1.1rem
      expect(result.toString()).toBe("1.1rem");
    });

    it("should resolve percentage with unitless numbers", () => {
      const result = interpretExpression("10 + 10%");
      // 10 + (10% of 10) = 10 + 1 = 11
      expect(result.toString()).toBe("11");
    });

    it("should handle complex relative operations", () => {
      const result = interpretExpression("10px + 10% + 20px");
      // First: 10px + 10% = 11px, then: 11px + 20px = 31px
      expect(result.toString()).toBe("31px");
    });

    it("should handle percentage multiplication", () => {
      const result = interpretExpression("10rem * 10%");
      // 10rem * 10% = 10rem * 0.1 = 1rem
      expect(result.toString()).toBe("1rem");
    });

    it("should handle percentage division", () => {
      const result = interpretExpression("10px / 50%");
      // 10px / 50% = 10px / 0.5 = 20px
      expect(result.toString()).toBe("20px");
    });

    it("should handle percentage with unitless multiplication", () => {
      const result = interpretExpression("100 * 25%");
      // 100 * 25% = 100 * 0.25 = 25
      expect(result.toString()).toBe("25");
    });
  });

  describe("Sum Function with Units", () => {
    it("should sum numbers without units", () => {
      const result = interpretExpression("sum(10, 5, 3)");
      expect(result.toString()).toBe("18");
    });

    it("should sum same units", () => {
      const result = interpretExpression("sum(10px, 5px, 3px)");
      expect(result.toString()).toBe("18px");
    });

    it("should sum mixed absolute units", () => {
      const result = interpretExpression("sum(10px, 1rem)");
      // 10px + 16px = 26px
      expect(result.toString()).toBe("26px");
    });

    it("should sum with unitless and units", () => {
      const result = interpretExpression("sum(10px, 5)");
      expect(result.toString()).toBe("15px");
    });

    it("should handle complex sum with conversions", () => {
      const result = interpretExpression("sum(10px, 10, 1rem)");
      // 10px + 10px + 16px = 36px
      expect(result.toString()).toBe("36px");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for multiple relative units in sum", () => {
      expect(() => {
        interpretExpression("sum(10px, 10%, 1rem)");
      }).toThrow("Cannot convert multiple relative units");
    });

    it("should throw error for unsupported unit combinations", () => {
      expect(() => {
        interpretExpression("10s + 10px"); // time + length units
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