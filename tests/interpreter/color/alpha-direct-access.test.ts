import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Config } from "@interpreter/config/config";
import { createInterpreter } from "@tests/interpreter/test-helpers";
import { beforeEach, describe, expect, it } from "vitest";

describe("Color Alpha - Direct Access", () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
    const rgbSpec = readFileSync(join(__dirname, "../../../data/specifications/colors/rgb.json"), "utf-8");
    config.colorManager.register("test://rgb", rgbSpec);
    const hslSpec = readFileSync(join(__dirname, "../../../data/specifications/colors/hsl.json"), "utf-8");
    config.colorManager.register("test://hsl", hslSpec);
  });

  describe("Setting and retrieving alpha", () => {
    const testCases = [
      { type: "RGB", init: "rgb(255, 0, 0)", alpha: 0.5 },
      { type: "RGB", init: null, alpha: 0.5 },
      { type: "HSL", init: "hsl(0, 100, 50)", alpha: 0.3 },
      { type: "HSL", init: null, alpha: 0.3 },
      { type: "Hex", init: "#ff0000", alpha: 0.7 },
      { type: "Hex", init: null, alpha: 0.8 },
    ];

    testCases.forEach(({ type, init, alpha }) => {
      const state = init ? "initialized" : "uninitialized";
      it(`should set and retrieve alpha=${alpha} on ${state} ${type} color`, () => {
        const initLine = init ? `= ${init}` : "";
        const interpreter = createInterpreter(
          `
          variable color: Color.${type} ${initLine};
          color.alpha = ${alpha};
          return color.alpha;
        `,
          {},
          config,
        );

        const result = interpreter.interpret();
        expect(result.value).toBe(alpha);
      });
    });
  });

  describe("Alpha validation", () => {
    const validCases = [
      { value: 0, description: "fully transparent" },
      { value: 1, description: "fully opaque" },
      { value: 0.5, description: "semi-transparent" },
    ];

    validCases.forEach(({ value, description }) => {
      it(`should accept alpha=${value} (${description})`, () => {
        const interpreter = createInterpreter(
          `
          variable color: Color.RGB = rgb(255, 0, 0);
          color.alpha = ${value};
          return color.alpha;
        `,
          {},
          config,
        );

        const result = interpreter.interpret();
        expect(result.value).toBe(value);
      });
    });

    const invalidCases = [
      { value: -0.5, description: "negative" },
      { value: 1.5, description: "greater than 1" },
      { value: '"0.5"', description: "string" },
    ];

    invalidCases.forEach(({ value, description }) => {
      it(`should throw error for alpha=${value} (${description})`, () => {
        const interpreter = createInterpreter(
          `
          variable color: Color.RGB = rgb(255, 0, 0);
          color.alpha = ${value};
          return color.alpha;
        `,
          {},
          config,
        );

        expect(() => interpreter.interpret()).toThrow();
      });
    });
  });

  describe("Alpha default value", () => {
    it("should return null for alpha when not set", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB = rgb(255, 0, 0);
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(null);
    });

    it("should return null for alpha on empty color", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(null);
    });
  });

  describe("Alpha with color formatting", () => {
    const formattingCases = [
      { alpha: 0.5, expected: "rgb(255, 0, 0, 0.5)", description: "alpha < 1" },
      { alpha: 1, expected: "rgb(255, 0, 0)", description: "alpha = 1" },
      { alpha: null, expected: "rgb(255, 0, 0)", description: "alpha = null" },
    ];

    formattingCases.forEach(({ alpha, expected, description }) => {
      it(`should format correctly when ${description}`, () => {
        const setAlpha = alpha !== null ? `color.alpha = ${alpha};` : "";
        const interpreter = createInterpreter(
          `
          variable color: Color.RGB = rgb(255, 0, 0);
          ${setAlpha}
          return color;
        `,
          {},
          config,
        );

        const result = interpreter.interpret();
        expect(result.toString()).toBe(expected);
      });
    });
  });

  describe("Alpha preservation through conversions", () => {
    const conversionCases = [
      {
        from: "RGB",
        to: "Hex",
        init: "rgb(255, 0, 0)",
        alpha: 0.5,
        expectedValue: "#ff0000",
      },
      {
        from: "Hex",
        to: "RGB",
        init: "#ff0000",
        alpha: 0.3,
        expectedChannels: { r: 255, g: 0, b: 0 },
      },
    ];

    conversionCases.forEach(({ from, to, init, alpha, expectedValue, expectedChannels }) => {
      it(`should preserve alpha=${alpha} when converting ${from} to ${to}`, () => {
        const interpreter = createInterpreter(
          `
          variable color: Color.${from} = ${init};
          color.alpha = ${alpha};
          variable converted: Color.${to} = color.to.${to.toLowerCase()}();
          return converted;
        `,
          {},
          config,
        );

        const result = interpreter.interpret();
        expect(result.alpha).toBe(alpha);

        // Verify color channels are preserved
        if (expectedValue) {
          expect(result.value).toBe(expectedValue);
        }
        if (expectedChannels) {
          for (const [key, val] of Object.entries(expectedChannels)) {
            expect(result.value[key].value).toBe(val);
          }
        }
      });
    });

    it("should preserve alpha through multi-step conversion chain", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB = rgb(255, 0, 0);
        color.alpha = 0.5;
        variable hexColor: Color.Hex = color.to.hex();
        variable finalColor: Color.RGB = hexColor.to.rgb();
        return finalColor;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.alpha).toBe(0.5);
      expect(result.value.r.value).toBe(255);
      expect(result.value.g.value).toBe(0);
      expect(result.value.b.value).toBe(0);
    });
  });

  describe("Alpha with collections", () => {
    it("should preserve alpha when storing color in List", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB = rgb(255, 0, 0);
        color.alpha = 0.5;
        variable colors: List;
        colors.append(color);
        variable retrieved: Color.RGB = colors.get(0);
        return retrieved;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.alpha).toBe(0.5);
      expect(result.value.r.value).toBe(255);
      expect(result.value.g.value).toBe(0);
      expect(result.value.b.value).toBe(0);
    });

    it("should preserve alpha when storing color in Dictionary", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB = rgb(255, 0, 0);
        color.alpha = 0.5;
        variable dict: Dictionary;
        dict.set("red", color);
        variable retrieved: Color.RGB = dict.get("red");
        return retrieved;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.alpha).toBe(0.5);
      expect(result.value.r.value).toBe(255);
      expect(result.value.g.value).toBe(0);
      expect(result.value.b.value).toBe(0);
    });
  });

  describe("Multiple alpha modifications", () => {
    it("should allow updating alpha multiple times", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB = rgb(255, 0, 0);
        color.alpha = 0.5;
        color.alpha = 0.8;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(0.8);
    });

    it("should allow setting alpha to null", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.RGB = rgb(255, 0, 0);
        color.alpha = 0.5;
        color.alpha = null;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(null);
    });
  });

  describe("Alpha extraction from hex8 colors", () => {
    it("should extract alpha from hex8 color literal", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.Hex = #FF000080;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      // 0x80 = 128, 128/255 ≈ 0.502
      expect(result.value).toBeCloseTo(128 / 255, 5);
    });

    it("should extract alpha from hex4 color literal", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.Hex = #F008;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      // 0x88 = 136, 136/255 ≈ 0.533
      expect(result.value).toBeCloseTo(136 / 255, 5);
    });

    it("should extract full opacity from hex8 with FF alpha", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.Hex = #FF0000FF;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(1);
    });

    it("should extract zero alpha from hex8 with 00 alpha", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.Hex = #FF000000;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(0);
    });

    it("should have null alpha for hex6 colors (no alpha specified)", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.Hex = #FF0000;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(null);
    });

    it("should have null alpha for hex3 colors (no alpha specified)", () => {
      const interpreter = createInterpreter(
        `
        variable color: Color.Hex = #F00;
        return color.alpha;
      `,
        {},
        config,
      );

      const result = interpreter.interpret();
      expect(result.value).toBe(null);
    });
  });
});
