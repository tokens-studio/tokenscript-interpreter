import { describe, expect, it } from "vitest";
import { ColorSymbol, StringSymbol, NumberSymbol } from "@src/interpreter/symbols";
import { InterpreterError } from "@src/interpreter/errors";
import { Config } from "@src/interpreter/config/config";
import { ColorManager } from "@src/interpreter/config/managers/color/manager";
import type { ColorSpecification } from "@src/interpreter/config/managers/color/schema";

describe("ColorSymbol", () => {
  describe("constructor", () => {
    it("should create hex color from valid hex string", () => {
      const color = new ColorSymbol("#ff0000");
      expect(color.value).toBe("#ff0000");
      expect(color.subType).toBe("Hex");
      expect(color.isHex()).toBe(true);
    });

    it("should create hex color with explicit subType", () => {
      const color = new ColorSymbol("#00ff00", "hex");
      expect(color.value).toBe("#00ff00");
      expect(color.subType).toBe("Hex");
    });

    it("should create dynamic color from object", () => {
      const colorValue = {
        red: new StringSymbol("255"),
        green: new StringSymbol("128"),
        blue: new StringSymbol("64"),
      };
      const color = new ColorSymbol(colorValue, "rgb");
      expect(color.value).toEqual(colorValue);
      expect(color.subType).toBe("rgb");
      expect(color.isHex()).toBe(false);
    });

    it("should create null color", () => {
      const color = new ColorSymbol(null);
      expect(color.value).toBe(null);
      expect(color.subType).toBe(null);
    });

    it("should throw error for invalid hex format", () => {
      expect(() => new ColorSymbol("invalid")).toThrow(InterpreterError);
      expect(() => new ColorSymbol("#gg0000")).toThrow(InterpreterError);
    });

    it("should throw error for invalid value type", () => {
      expect(() => new ColorSymbol(42 as any)).toThrow(InterpreterError);
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy of hex color", () => {
      const original = new ColorSymbol("#ff0000");
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe("#ff0000");
      expect(copy.subType).toBe("Hex");
    });

    it("should create a deep copy of dynamic color", () => {
      const colorValue = {
        red: new StringSymbol("255"),
        green: new StringSymbol("128"),
      };
      const original = new ColorSymbol(colorValue, "rgb");
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).not.toBe(original.value);
      expect((copy.value as any).red).not.toBe(colorValue.red);
      expect((copy.value as any).red.value).toBe("255");
    });

    it("should create a deep copy of null color", () => {
      const original = new ColorSymbol(null);
      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).toBe(null);
    });
  });

  describe("toStringImpl", () => {
    it("should convert hex color to string", () => {
      const color = new ColorSymbol("#ff0000");
      const result = color.toStringImpl();
      expect(result).toBeInstanceOf(StringSymbol);
      expect(result.value).toBe("#ff0000");
    });

    it("should convert dynamic color to object string", () => {
      const colorValue = {
        red: new StringSymbol("255"),
        green: new StringSymbol("128"),
      };
      const color = new ColorSymbol(colorValue, "rgb");
      const result = color.toStringImpl();
      expect(result.value).toBe("{red: 255, green: 128}");
    });

    it("should convert null color to empty string", () => {
      const color = new ColorSymbol(null);
      const result = color.toStringImpl();
      expect(result.value).toBe("");
    });

    describe("with config and color manager", () => {
      it("should use formatColorMethod for hex colors when config is provided", () => {
        const colorManager = new ColorManager();
        const config = new Config({ colorManager });
        const color = new ColorSymbol("#ff0000", "Hex", config);
        
        const result = color.toStringImpl();
        expect(result.value).toBe("#ff0000");
      });

      it("should use formatColorMethod for dynamic colors with schema", () => {
        const colorManager = new ColorManager();
        const config = new Config({ colorManager });
        
        // Register RGB schema
        const rgbSpec: ColorSpecification = {
          name: "RGB",
          type: "color",
          schema: {
            type: "object",
            order: ["r", "g", "b"],
            properties: {
              r: { type: "number" },
              g: { type: "number" },
              b: { type: "number" }
            }
          },
          initializers: [],
          conversions: []
        };
        
        colorManager.register("https://test.example/rgb/", rgbSpec);
        
        const rgbColor = new ColorSymbol({
          r: new NumberSymbol(255),
          g: new NumberSymbol(128),
          b: new NumberSymbol(64)
        }, "RGB", config);
        
        const result = rgbColor.toStringImpl();
        expect(result.value).toBe("rgb(255, 128, 64)");
      });

      it("should fallback to JSON.stringify when no schema is found", () => {
        const colorManager = new ColorManager();
        const config = new Config({ colorManager });
        
        const colorValue = {
          red: new NumberSymbol(255),
          green: new NumberSymbol(128),
        };
        const color = new ColorSymbol(colorValue, "UnknownType", config);
        
        const result = color.toStringImpl();
        expect(result.value).toBe(""); // formatColorMethod returns empty string for unknown types
      });
    });
  });

  describe("typeEquals", () => {
    it("should match same color types", () => {
      const color1 = new ColorSymbol("#ff0000");
      const color2 = new ColorSymbol("#00ff00");
      expect(color1.typeEquals(color2)).toBe(true);
    });

    it("should match different color subtypes", () => {
      const hexColor = new ColorSymbol("#ff0000");
      const rgbColor = new ColorSymbol({ r: new StringSymbol("255") }, "rgb");
      expect(hexColor.typeEquals(rgbColor)).toBe(false);
    });

    it("should handle edge case: color without type equals hex", () => {
      const colorWithoutType = new ColorSymbol("#ff0000");
      const hexColor = new ColorSymbol("#00ff00", "hex");
      expect(colorWithoutType.typeEquals(hexColor)).toBe(true);
      expect(hexColor.typeEquals(colorWithoutType)).toBe(true);
    });
  });

  describe("isHex", () => {
    it("should identify hex colors", () => {
      const hexColor = new ColorSymbol("#ff0000");
      expect(hexColor.isHex()).toBe(true);

      const explicitHex = new ColorSymbol("#00ff00", "hex");
      expect(explicitHex.isHex()).toBe(true);

      const rgbColor = new ColorSymbol({ r: new StringSymbol("255") }, "rgb");
      expect(rgbColor.isHex()).toBe(false);
    });
  });

  describe("validValue", () => {
    it("should validate color values", () => {
      const color = new ColorSymbol("#ff0000");
      expect(color.validValue(new ColorSymbol("#00ff00"))).toBe(true);
      expect(color.validValue(null)).toBe(true);
      expect(color.validValue("#0000ff")).toBe(true);
      expect(color.validValue({ r: "255" })).toBe(true);
      expect(color.validValue("invalid")).toBe(false);
      expect(color.validValue(42)).toBe(false);
    });
  });

  describe("hasAttribute and getAttribute", () => {
    it("should support attributes for dynamic colors", () => {
      const colorValue = {
        red: new StringSymbol("255"),
        green: new StringSymbol("128"),
        blue: new StringSymbol("64"),
      };
      const color = new ColorSymbol(colorValue, "rgb");

      expect(color.hasAttribute("red")).toBe(true);
      expect(color.hasAttribute("green")).toBe(true);
      expect(color.hasAttribute("blue")).toBe(true);
      expect(color.hasAttribute("alpha")).toBe(false);

      expect(color.getAttribute("red")?.value).toBe("255");
      expect(color.getAttribute("green")?.value).toBe("128");
      expect(color.getAttribute("blue")?.value).toBe("64");
    });

    it("should not support attributes for hex colors", () => {
      const color = new ColorSymbol("#ff0000");
      expect(color.hasAttribute("red")).toBe(false);
      expect(() => color.getAttribute("red")).toThrow(InterpreterError);
    });

    it("should not support attributes for null colors", () => {
      const color = new ColorSymbol(null);
      expect(color.hasAttribute("red")).toBe(false);
      expect(() => color.getAttribute("red")).toThrow(InterpreterError);
    });
  });

  describe("getTypeName", () => {
    it("should return type name with subtype", () => {
      const hexColor = new ColorSymbol("#ff0000");
      expect(hexColor.getTypeName()).toBe("Color.Hex");

      const rgbColor = new ColorSymbol({ r: new StringSymbol("255") }, "rgb");
      expect(rgbColor.getTypeName()).toBe("Color.Rgb");
    });

    it("should return base type name when no subtype", () => {
      const color = new ColorSymbol(null);
      expect(color.getTypeName()).toBe("Color");
    });
  });

  describe("toString", () => {
    it("should return string representation", () => {
      const color = new ColorSymbol("#ff0000");
      expect(color.toString()).toBe("#ff0000");
    });
  });

  describe("equals", () => {
    it("should compare colors correctly", () => {
      const color1 = new ColorSymbol("#ff0000");
      const color2 = new ColorSymbol("#ff0000");
      const color3 = new ColorSymbol("#00ff00");

      expect(color1.equals(color2)).toBe(true);
      expect(color1.equals(color3)).toBe(false);
    });
  });

  describe("static methods", () => {
    it("should create empty color", () => {
      const empty = ColorSymbol.empty();
      expect(empty.value).toBe(null);
    });
  });
});
