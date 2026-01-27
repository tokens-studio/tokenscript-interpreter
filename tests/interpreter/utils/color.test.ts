import { isValidHex, parseHexWithAlpha } from "@src/interpreter/utils/color";
import { describe, expect, it } from "vitest";

describe("Color Utils", () => {
  describe("isValidHex", () => {
    it("should validate hex3 colors", () => {
      expect(isValidHex("#F00")).toBe(true);
      expect(isValidHex("#abc")).toBe(true);
      expect(isValidHex("#123")).toBe(true);
    });

    it("should validate hex4 colors (with alpha)", () => {
      expect(isValidHex("#F00F")).toBe(true);
      expect(isValidHex("#abcd")).toBe(true);
      expect(isValidHex("#1234")).toBe(true);
    });

    it("should validate hex6 colors", () => {
      expect(isValidHex("#FF0000")).toBe(true);
      expect(isValidHex("#aabbcc")).toBe(true);
      expect(isValidHex("#123456")).toBe(true);
    });

    it("should validate hex8 colors (with alpha)", () => {
      expect(isValidHex("#FF0000FF")).toBe(true);
      expect(isValidHex("#aabbccdd")).toBe(true);
      expect(isValidHex("#12345678")).toBe(true);
    });

    it("should reject invalid hex colors", () => {
      expect(isValidHex("#GG0000")).toBe(false);
      expect(isValidHex("#12")).toBe(false);
      expect(isValidHex("#12345")).toBe(false);
      expect(isValidHex("#1234567")).toBe(false);
      expect(isValidHex("#123456789")).toBe(false);
      expect(isValidHex("FF0000")).toBe(false);
      expect(isValidHex("invalid")).toBe(false);
      expect(isValidHex("")).toBe(false);
    });
  });

  describe("parseHexWithAlpha", () => {
    describe("hex3 format", () => {
      it("should preserve hex3 format without alpha", () => {
        const result = parseHexWithAlpha("#F00");
        expect(result.color).toBe("#F00");
        expect(result.alpha).toBe(null);
      });

      it("should handle lowercase hex3", () => {
        const result = parseHexWithAlpha("#abc");
        expect(result.color).toBe("#abc");
        expect(result.alpha).toBe(null);
      });
    });

    describe("hex4 format", () => {
      it("should expand hex4 to hex6 and extract alpha", () => {
        const result = parseHexWithAlpha("#F00F");
        expect(result.color).toBe("#FF0000");
        expect(result.alpha).toBe(1); // FF = 255/255 = 1
      });

      it("should handle half transparency", () => {
        const result = parseHexWithAlpha("#F008");
        expect(result.color).toBe("#FF0000");
        // 88 in hex = 136 in decimal, 136/255 ≈ 0.533
        expect(result.alpha).toBeCloseTo(136 / 255, 5);
      });

      it("should handle fully transparent", () => {
        const result = parseHexWithAlpha("#F000");
        expect(result.color).toBe("#FF0000");
        expect(result.alpha).toBe(0);
      });

      it("should handle lowercase hex4", () => {
        const result = parseHexWithAlpha("#abc8");
        expect(result.color).toBe("#aabbcc");
        expect(result.alpha).toBeCloseTo(136 / 255, 5);
      });
    });

    describe("hex6 format", () => {
      it("should preserve hex6 format without alpha", () => {
        const result = parseHexWithAlpha("#FF0000");
        expect(result.color).toBe("#FF0000");
        expect(result.alpha).toBe(null);
      });

      it("should handle lowercase hex6", () => {
        const result = parseHexWithAlpha("#aabbcc");
        expect(result.color).toBe("#aabbcc");
        expect(result.alpha).toBe(null);
      });
    });

    describe("hex8 format", () => {
      it("should extract hex6 color and alpha from hex8", () => {
        const result = parseHexWithAlpha("#FF0000FF");
        expect(result.color).toBe("#FF0000");
        expect(result.alpha).toBe(1); // FF = 255/255 = 1
      });

      it("should handle half transparency", () => {
        const result = parseHexWithAlpha("#FF000080");
        expect(result.color).toBe("#FF0000");
        // 80 in hex = 128 in decimal, 128/255 ≈ 0.502
        expect(result.alpha).toBeCloseTo(128 / 255, 5);
      });

      it("should handle fully transparent", () => {
        const result = parseHexWithAlpha("#FF000000");
        expect(result.color).toBe("#FF0000");
        expect(result.alpha).toBe(0);
      });

      it("should handle lowercase hex8", () => {
        const result = parseHexWithAlpha("#aabbcc80");
        expect(result.color).toBe("#aabbcc");
        expect(result.alpha).toBeCloseTo(128 / 255, 5);
      });

      it("should handle various alpha values", () => {
        // 40% opacity = 102/255 = 0x66
        const result = parseHexWithAlpha("#00FF0066");
        expect(result.color).toBe("#00FF00");
        expect(result.alpha).toBeCloseTo(102 / 255, 5);
      });
    });

    describe("error handling", () => {
      it("should throw for invalid hex colors", () => {
        expect(() => parseHexWithAlpha("invalid")).toThrow();
        expect(() => parseHexWithAlpha("#GG0000")).toThrow();
        expect(() => parseHexWithAlpha("#12")).toThrow();
      });
    });
  });
});
