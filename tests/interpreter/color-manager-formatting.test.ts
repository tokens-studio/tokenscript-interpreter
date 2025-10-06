import { describe, expect, it } from "vitest";
import { ColorManager } from "@interpreter/config/managers/color/manager";
import { ColorSymbol, NumberSymbol } from "@interpreter/symbols";
import type { ColorSpecification } from "@interpreter/config/managers/color/schema";

describe("ColorManager.formatColorMethod", () => {
  describe("hex colors", () => {
    it("should return hex string for hex colors", () => {
      const colorManager = new ColorManager();
      const hexColor = new ColorSymbol("#ff0000", "Hex");
      
      const result = colorManager.formatColorMethod(hexColor);
      
      expect(result).toBe("#ff0000");
    });

    it("should handle different hex formats", () => {
      const colorManager = new ColorManager();
      const cases = ["#000", "#ffffff", "#FF00FF"];
      
      for (const hex of cases) {
        const hexColor = new ColorSymbol(hex, "Hex");
        const result = colorManager.formatColorMethod(hexColor);
        expect(result).toBe(hex);
      }
    });
  });

  describe("dynamic colors with schemas", () => {
    it("should format HSL colors using schema order", () => {
      const colorManager = new ColorManager();
      
      // Register HSL schema with specific order
      const hslSpec: ColorSpecification = {
        name: "HSL",
        type: "color",
        schema: {
          type: "object",
          order: ["h", "s", "l"],
          properties: {
            h: { type: "number" },
            s: { type: "number" },
            l: { type: "number" }
          }
        },
        initializers: [],
        conversions: []
      };
      
      const uri = "https://test.example/hsl/";
      colorManager.register(uri, hslSpec);
      
      const hslColor = new ColorSymbol({
        h: new NumberSymbol(120),
        s: new NumberSymbol(75),
        l: new NumberSymbol(50)
      }, "HSL");
      
      const result = colorManager.formatColorMethod(hslColor);
      
      expect(result).toBe("hsl(120, 75, 50)");
    });

    it("should format RGB colors using schema order", () => {
      const colorManager = new ColorManager();
      
      // Register RGB schema with specific order
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
      
      const uri = "https://test.example/rgb/";
      colorManager.register(uri, rgbSpec);
      
      const rgbColor = new ColorSymbol({
        r: new NumberSymbol(255),
        g: new NumberSymbol(128),
        b: new NumberSymbol(0)
      }, "RGB");
      
      const result = colorManager.formatColorMethod(rgbColor);
      
      expect(result).toBe("rgb(255, 128, 0)");
    });

    it("should handle different schema order", () => {
      const colorManager = new ColorManager();
      
      // Register schema with unconventional order
      const customSpec: ColorSpecification = {
        name: "CustomColor",
        type: "color",
        schema: {
          type: "object",
          order: ["z", "x", "y"], // Unusual order
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" }
          }
        },
        initializers: [],
        conversions: []
      };
      
      const uri = "https://test.example/custom/";
      colorManager.register(uri, customSpec);
      
      const customColor = new ColorSymbol({
        x: new NumberSymbol(10),
        y: new NumberSymbol(20), 
        z: new NumberSymbol(30)
      }, "CustomColor");
      
      const result = colorManager.formatColorMethod(customColor);
      
      expect(result).toBe("customcolor(30, 10, 20)"); // z, x, y order
    });

    it("should handle missing values with default '0'", () => {
      const colorManager = new ColorManager();
      
      const hslSpec: ColorSpecification = {
        name: "HSL",
        type: "color",
        schema: {
          type: "object",
          order: ["h", "s", "l"],
          properties: {
            h: { type: "number" },
            s: { type: "number" },
            l: { type: "number" }
          }
        },
        initializers: [],
        conversions: []
      };
      
      const uri = "https://test.example/hsl/";
      colorManager.register(uri, hslSpec);
      
      // Color with missing 's' value
      const incompleteColor = new ColorSymbol({
        h: new NumberSymbol(240),
        l: new NumberSymbol(60)
        // s is missing
      }, "HSL");
      
      const result = colorManager.formatColorMethod(incompleteColor);
      
      expect(result).toBe("hsl(240, 0, 60)"); // Missing 's' defaults to '0'
    });
  });

  describe("edge cases", () => {
    it("should return empty string for colors without specs", () => {
      const colorManager = new ColorManager();
      
      const unknownColor = new ColorSymbol({
        r: new NumberSymbol(255),
        g: new NumberSymbol(0),
        b: new NumberSymbol(0)
      }, "UnknownType");
      
      const result = colorManager.formatColorMethod(unknownColor);
      
      expect(result).toBe("");
    });

    it("should return empty string for colors without schema order", () => {
      const colorManager = new ColorManager();
      
      const specWithoutOrder: ColorSpecification = {
        name: "NoOrder",
        type: "color",
        schema: {
          type: "object",
          // No order property
          properties: {
            a: { type: "number" },
            b: { type: "number" }
          }
        },
        initializers: [],
        conversions: []
      };
      
      const uri = "https://test.example/noorder/";
      colorManager.register(uri, specWithoutOrder);
      
      const noOrderColor = new ColorSymbol({
        a: new NumberSymbol(1),
        b: new NumberSymbol(2)
      }, "NoOrder");
      
      const result = colorManager.formatColorMethod(noOrderColor);
      
      expect(result).toBe("noorder(1, 2)");
    });

    it("should return empty string for null color values", () => {
      const colorManager = new ColorManager();
      
      const nullColor = new ColorSymbol(null);
      
      const result = colorManager.formatColorMethod(nullColor);
      
      expect(result).toBe("");
    });

    it("should handle empty schema order array", () => {
      const colorManager = new ColorManager();
      
      const emptyOrderSpec: ColorSpecification = {
        name: "EmptyOrder",
        type: "color",
        schema: {
          type: "object",
          order: [], // Empty order array
          properties: {
            a: { type: "number" }
          }
        },
        initializers: [],
        conversions: []
      };
      
      const uri = "https://test.example/empty/";
      colorManager.register(uri, emptyOrderSpec);
      
      const emptyOrderColor = new ColorSymbol({
        a: new NumberSymbol(42)
      }, "EmptyOrder");
      
      const result = colorManager.formatColorMethod(emptyOrderColor);
      
      expect(result).toBe("emptyorder(42)");
    });
  });

  describe("value type handling", () => {
    it("should handle NumberSymbol values", () => {
      const colorManager = new ColorManager();
      
      const hslSpec: ColorSpecification = {
        name: "HSL",
        type: "color",
        schema: {
          type: "object",
          order: ["h", "s", "l"],
          properties: {
            h: { type: "number" },
            s: { type: "number" },
            l: { type: "number" }
          }
        },
        initializers: [],
        conversions: []
      };
      
      const uri = "https://test.example/hsl/";
      colorManager.register(uri, hslSpec);
      
      const hslColor = new ColorSymbol({
        h: new NumberSymbol(180),
        s: new NumberSymbol(50),
        l: new NumberSymbol(75)
      }, "HSL");
      
      const result = colorManager.formatColorMethod(hslColor);
      
      expect(result).toBe("hsl(180, 50, 75)");
    });

    it("should handle primitive number values", () => {
      const colorManager = new ColorManager();
      
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
      
      const uri = "https://test.example/rgb/";
      colorManager.register(uri, rgbSpec);
      
      const rgbColor = new ColorSymbol({
        r: new NumberSymbol(200),
        g: new NumberSymbol(150),
        b: new NumberSymbol(100)
      }, "RGB");
      
      const result = colorManager.formatColorMethod(rgbColor);
      
      expect(result).toBe("rgb(200, 150, 100)");
    });
  });
});
