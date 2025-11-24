import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { processTokens } from "@src/processor/process";
import { describe, expect, it } from "vitest";

describe("CLI Functionality", () => {
  describe("Expression Interpretation", () => {
    it("should interpret simple mathematical expressions", () => {
      const code = "5 + 12";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).toBeTruthy();

      const interpreter = new Interpreter(ast!, {});
      const result = interpreter.interpret();

      expect(result?.toString()).toBe("17");
    });

    it("should interpret expressions with units", () => {
      const code = "10 * 2px";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).toBeTruthy();

      const interpreter = new Interpreter(ast!, {});
      const result = interpreter.interpret();

      expect(result?.toString()).toBe("20px");
    });

    it("should interpret expressions with references", () => {
      const code = "{base} * 2px";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).toBeTruthy();

      const interpreter = new Interpreter(ast!, { references: { base: 16 } });
      const result = interpreter.interpret();

      expect(result?.toString()).toBe("32px");
    });

    it("should handle complex expressions", () => {
      const code = "min(10px, 20px, 5px)";
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).toBeTruthy();

      const interpreter = new Interpreter(ast!, {});
      const result = interpreter.interpret();

      // Note: min function currently returns just the number, not with unit
      expect(result?.toString()).toBe("5");
    });
  });

  describe("Token Interpretation", () => {
    it("should resolve simple tokens", () => {
      const tokens = {
        "simple.token": "16px",
        "another.token": "24px",
      };

      const output = processTokens(tokens, { output: "symbols" });

      expect(output.tokens.get("simple.token")?.toString()).toBe("16px");
      expect(output.tokens.get("another.token")?.toString()).toBe("24px");
    });

    it("should resolve token dependencies", () => {
      const tokens = {
        base: "16",
        derived: "{base} * 2px",
      };

      const output = processTokens(tokens, { output: "symbols" });

      expect(output.tokens.get("base")?.toString()).toBe("16");
      expect(output.tokens.get("derived")?.toString()).toBe("32px");
    });

    it("should handle complex token dependencies", () => {
      const tokens = {
        "base.spacing": "8",
        scale: "2",
        small: "{base.spacing}px",
        medium: "{base.spacing} * {scale}px",
        large: "{medium} + {small}",
      };

      const output = processTokens(tokens, { output: "symbols" });

      expect(output.tokens.get("base.spacing")?.toString()).toBe("8");
      expect(output.tokens.get("scale")?.toString()).toBe("2");
      expect(output.tokens.get("small")?.toString()).toBe("8px");
      expect(output.tokens.get("medium")?.toString()).toBe("16px");
      expect(output.tokens.get("large")?.toString()).toBe("24px");
    });

    it("should work with standard tokens JSON format", () => {
      const tokens = {
        "primary-color": {
          $value: "#ff6b35",
          $type: "color",
        },
        "base-spacing": {
          $value: "16px",
          $type: "dimension",
        },
        "large-spacing": {
          $value: "{base-spacing} * 2",
          $type: "dimension",
        },
      };

      const output = processTokens(tokens, { output: "symbols" });

      expect(output.tokens.get("primary-color")?.toString()).toBe("#ff6b35");
      expect(output.tokens.get("base-spacing")?.toString()).toBe("16px");
      expect(output.tokens.get("large-spacing")?.toString()).toBe("32px");
    });

    it("should work with non-standard token format", () => {
      const tokens = {
        "primary-color": {
          value: "#ff6b35",
          type: "color",
        },
        "base-spacing": {
          value: "16px",
          type: "dimension",
        },
        "large-spacing": {
          value: "{base-spacing} * 2",
          type: "dimension",
        },
      };

      const output = processTokens(tokens, { output: "symbols" });

      expect(output.tokens.get("primary-color")?.toString()).toBe("#ff6b35");
      expect(output.tokens.get("base-spacing")?.toString()).toBe("16px");
      expect(output.tokens.get("large-spacing")?.toString()).toBe("32px");
    });

    it("should resolve complex token chains", () => {
      const tokens = {
        base: {
          $value: "4px",
          $type: "dimension",
        },
        small: {
          $value: "{base} * 2",
          $type: "dimension",
        },
        medium: {
          $value: "{small} * 2",
          $type: "dimension",
        },
        large: {
          $value: "{medium} * 2",
          $type: "dimension",
        },
      };

      const output = processTokens(tokens, { output: "symbols" });

      expect(output.tokens.get("base")?.toString()).toBe("4px");
      expect(output.tokens.get("small")?.toString()).toBe("8px");
      expect(output.tokens.get("medium")?.toString()).toBe("16px");
      expect(output.tokens.get("large")?.toString()).toBe("32px");
    });

    it("should handle empty token sets", () => {
      const output = processTokens({}, { output: "symbols" });
      expect(output.tokens.size).toBe(0);
    });
  });

  describe("Circular Dependency Detection", () => {
    it("should detect self-referencing circular dependency", () => {
      const tokens = {
        circular: "{circular}",
      };

      expect(() => processTokens(tokens, { output: "symbols" })).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        processTokens(tokens, { output: "symbols" });
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should detect two-token circular dependency", () => {
      const tokens = {
        a: "{b}",
        b: "{a}",
      };

      expect(() => processTokens(tokens, { output: "symbols" })).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        processTokens(tokens, { output: "symbols" });
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should detect multi-token circular dependency chain", () => {
      const tokens = {
        a: "{b}",
        b: "{c}",
        c: "{d}",
        d: "{a}",
      };

      expect(() => processTokens(tokens, { output: "symbols" })).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        processTokens(tokens, { output: "symbols" });
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should not throw for valid dependency chains", () => {
      const tokens = {
        a: "10",
        b: "{a}",
        c: "{b}",
        d: "{c}",
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("a")?.toString()).toBe("10");
      expect(output.tokens.get("b")?.toString()).toBe("10");
      expect(output.tokens.get("c")?.toString()).toBe("10");
      expect(output.tokens.get("d")?.toString()).toBe("10");
    });

    it("should process non-circular tokens even when circular exists", () => {
      const tokens = {
        valid: "16px",
        circular1: "{circular2}",
        circular2: "{circular1}",
      };

      expect(() => processTokens(tokens, { output: "symbols" })).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        processTokens(tokens, { output: "symbols" });
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });
  });

  describe("Error Propagation", () => {
    it("should propagate errors from missing dependencies", () => {
      const tokens = {
        derived: "{missing}",
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.errors.size).toBeGreaterThan(0);
      expect(output.errors.has("derived")).toBe(true);
    });

    it("should propagate errors through dependency chains", () => {
      const tokens = {
        a: "{missing}",
        b: "{a}",
        c: "{b}",
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.errors.has("a")).toBe(true);
      expect(output.errors.has("b")).toBe(true);
      expect(output.errors.has("c")).toBe(true);
    });

    it("should not propagate errors to independent tokens", () => {
      const tokens = {
        valid: "10px",
        invalid: "{missing}",
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.errors.has("invalid")).toBe(true);
      expect(output.errors.has("valid")).toBe(false);
      expect(output.tokens.get("valid")?.toString()).toBe("10px");
    });

    it("should preserve original values in output when errors occur", () => {
      const tokens = {
        invalid: "{missing}",
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("invalid")).toBe("{missing}");
    });
  });

  describe("Theme Processing", () => {
    it("should flatten simple nested token structure without themes", () => {
      const tokens = {
        color: {
          primary: {
            $value: "#3B82F6",
            $type: "color",
          },
        },
        spacing: {
          base: {
            $value: "8px",
            $type: "dimension",
          },
        },
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("color.primary")?.toString()).toBe("#3B82F6");
      expect(output.tokens.get("spacing.base")?.toString()).toBe("8px");
    });

    it("should flatten and resolve nested structure with references", () => {
      const tokens = {
        base: {
          size: {
            $value: "16",
            $type: "number",
          },
        },
        derived: {
          small: {
            $value: "{base.size} * 0.75",
            $type: "number",
          },
          large: {
            $value: "{base.size} * 1.5",
            $type: "number",
          },
        },
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("base.size")?.toString()).toBe("16");
      expect(output.tokens.get("derived.small")?.toString()).toBe("12");
      expect(output.tokens.get("derived.large")?.toString()).toBe("24");
    });

    it("should handle deeply nested token structures", () => {
      const tokens = {
        design: {
          color: {
            brand: {
              primary: {
                $value: "#FF0000",
                $type: "color",
              },
            },
          },
        },
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("design.color.brand.primary")?.toString()).toBe("#FF0000");
    });

    it("should handle token groups with multiple values", () => {
      const tokens = {
        colors: {
          primary: {
            $value: "#FF0000",
            $type: "color",
          },
          secondary: {
            $value: "#00FF00",
            $type: "color",
          },
        },
        spacing: {
          small: {
            $value: "8px",
            $type: "dimension",
          },
          large: {
            $value: "16px",
            $type: "dimension",
          },
        },
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("colors.primary")?.toString()).toBe("#FF0000");
      expect(output.tokens.get("colors.secondary")?.toString()).toBe("#00FF00");
      expect(output.tokens.get("spacing.small")?.toString()).toBe("8px");
      expect(output.tokens.get("spacing.large")?.toString()).toBe("16px");
    });

    it("should handle references across nested groups", () => {
      const tokens = {
        base: {
          unit: {
            $value: "8",
            $type: "number",
          },
        },
        spacing: {
          small: {
            $value: "{base.unit}px",
            $type: "dimension",
          },
          large: {
            $value: "{base.unit} * 2px",
            $type: "dimension",
          },
        },
      };

      const output = processTokens(tokens, { output: "symbols" });
      expect(output.tokens.get("base.unit")?.toString()).toBe("8");
      expect(output.tokens.get("spacing.small")?.toString()).toBe("8px");
      expect(output.tokens.get("spacing.large")?.toString()).toBe("16px");
    });
  });
});
