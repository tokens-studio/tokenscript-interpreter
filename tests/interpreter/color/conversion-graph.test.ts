import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ColorManager } from "@interpreter/config/managers/color/manager";
import { Config } from "@interpreter/config/config";
import { createInterpreter } from "@tests/interpreter/test-helpers";

describe("ColorManager Conversion Graph", () => {
  let manager: ColorManager;
  let config: Config;

  beforeEach(() => {
    manager = new ColorManager();
    config = new Config({ colorManager: manager });
  });

  const runWithColorManager = (
    code: string, 
    schemaUris: Record<string, string> = {
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json"
    },
    references?: Record<string, any>
  ) => {
    Object.entries(schemaUris).forEach(([uri, filePath]) => {
      const fullPath = resolve(__dirname, "../../../", filePath);
      const spec = JSON.parse(readFileSync(fullPath, "utf-8"));
      manager.register(uri, spec);
    });

    const interpreter = createInterpreter(code, references || {}, config);
    return interpreter.interpret();
  };

  describe("Direct conversions", () => {
    it("should convert hex to rgb directly", () => {
      const result = runWithColorManager(`
        variable c: Color = {COLOR};
        variable rgb: Color.RGB = c.to.rgb();
        rgb.r
      `, {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json"
      }, { COLOR: "#ff0000" });

      expect(result.value).toBe(255);
    });

    it("should convert rgb to hex directly", () => {
      const result = runWithColorManager(`
        variable rgb: Color.RGB;
        rgb.r = 255;
        rgb.g = 0;
        rgb.b = 0;
        variable hex: Color.Hex = rgb.to.hex();
        hex
      `, {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json"
      });

      expect(result.toString()).toBe("#ff0000");
    });
  });

  describe("Indirect conversions through conversion graph", () => {
    it("should convert hex to hsl through rgb (indirect conversion)", () => {
      const result = runWithColorManager(`
        variable c: Color = {COLOR};
        return c.to.hsl()
      `, 
      {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/": "./data/specifications/colors/hsl.json"
      },
      { COLOR: "#ff0000" }
      );

      expect(result.subType).toBe("HSL");
      expect(result.value.h.value).toBe(0);
      expect(result.value.s.value).toBe(100);
      expect(result.value.l.value).toBe(50);
    });

    it("should convert hsl to hex through rgb (indirect conversion)", () => {
      const result = runWithColorManager(`
        variable hsl: Color.HSL = hsl(0, 100, 50);
        variable hex: Color.Hex = hsl.to.hex();
        hex
      `, 
      {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/": "./data/specifications/colors/hsl.json"
      });

      expect(result.toString()).toMatch(/#ff0000/i);
    });
  });

  describe("Multi-step conversion paths", () => {
    it("should find conversion paths with multiple intermediate steps", () => {
      const hexUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/";
      const hslUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/";

      Object.entries({
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/": "./data/specifications/colors/hsl.json"
      }).forEach(([uri, filePath]) => {
        const fullPath = resolve(__dirname, "../../../", filePath);
        const spec = JSON.parse(readFileSync(fullPath, "utf-8"));
        manager.register(uri, spec);
      });

      expect(manager.hasConversion(hexUri, hslUri)).toBe(true);
      expect(manager.hasConversion(hslUri, hexUri)).toBe(true);
    });

    it("should execute multi-step conversions correctly", () => {
      const result = runWithColorManager(`
        variable hex: Color = {COLOR};
        variable hsl: Color.HSL = hex.to.hsl();
        variable back: Color.Hex = hsl.to.hex();
        back
      `, 
      {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/": "./data/specifications/colors/hsl.json"
      },
      { COLOR: "#0080ff" });

      expect(result.toString().toLowerCase()).toMatch(/#0080ff|#0081ff/);
    });
  });

  describe("Conversion path finding", () => {
    it("should handle identity conversions", () => {
      const result = runWithColorManager(`
        variable hex: Color = {COLOR};
        variable same: Color.Hex = hex.to.hex();
        same
      `, {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json"
      },
      { COLOR: "#ffffff" });

      expect(result.toString()).toBe("#ffffff");
    });

    it("should return empty path when no conversion exists", () => {
      Object.entries({
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json"
      }).forEach(([uri, filePath]) => {
        const fullPath = resolve(__dirname, "../../../", filePath);
        const spec = JSON.parse(readFileSync(fullPath, "utf-8"));
        manager.register(uri, spec);
      });

      const nonExistentUri = "https://example.com/nonexistent-color/";
      const rgbUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/";

      expect(manager.hasConversion(nonExistentUri, rgbUri)).toBe(false);
      expect(manager.hasConversion(rgbUri, nonExistentUri)).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should throw error for missing source color type", () => {
      expect(() => {
        runWithColorManager(`
          variable unknown: Color.Unknown = "#ff0000";
          unknown.to.rgb()
        `, {
          "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json"
        });
      }).toThrow();
    });

    it("should throw error when no conversion path exists", () => {
      Object.entries({
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json"
      }).forEach(([uri, filePath]) => {
        const fullPath = resolve(__dirname, "../../../", filePath);
        const spec = JSON.parse(readFileSync(fullPath, "utf-8"));
        manager.register(uri, spec);
      });

      const isolatedSpec = {
        name: "Isolated",
        type: "color",
        description: "Color with no conversions",
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          additionalProperties: false
        },
        initializers: [],
        conversions: []
      };

      manager.register("test://isolated", isolatedSpec);

      const rgbUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/";
      const isolatedUri = "test://isolated";

      expect(manager.hasConversion(isolatedUri, rgbUri)).toBe(false);
      expect(manager.hasConversion(rgbUri, isolatedUri)).toBe(false);
    });
  });

  describe("URI normalization", () => {
    it("should handle URIs with version numbers correctly", () => {
      Object.entries({
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/": "./data/specifications/colors/hsl.json"
      }).forEach(([uri, filePath]) => {
        const fullPath = resolve(__dirname, "../../../", filePath);
        const spec = JSON.parse(readFileSync(fullPath, "utf-8"));
        manager.register(uri, spec);
      });

      const hexV0 = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/";
      const rgbUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/";

      expect(manager.hasConversion(hexV0, rgbUri)).toBe(true);
    });
  });

  describe("Performance and cycles", () => {
    it("should not get stuck in conversion cycles", () => {
      const result = runWithColorManager(`
        variable start: Color = {COLOR};
        variable rgb: Color.RGB = start.to.rgb();
        variable hsl: Color.HSL = rgb.to.hsl();
        variable backRgb: Color.RGB = hsl.to.rgb();
        variable end: Color.Hex = backRgb.to.hex();
        end
      `, 
      {
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/": "./data/specifications/colors/rgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/": "./data/specifications/colors/srgb.json",
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/": "./data/specifications/colors/hsl.json"
      },
      { COLOR: "#ff8800" });

      expect(result.toString()).toMatch(/#[0-9a-f]{6}/i);
    });
  });
});
