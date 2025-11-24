import { InterpreterErrorCode } from "@interpreter/errors/codes/interpreter";
import { LexerErrorCode } from "@interpreter/errors/codes/lexer";
import { OperationsErrorCode } from "@interpreter/errors/codes/operations";
import { getMessage } from "@interpreter/errors/messages";
import { describe, expect, it } from "vitest";

describe("getMessage", () => {
  describe("String templates", () => {
    it("should return simple string message without data", () => {
      const message = getMessage(LexerErrorCode.UNTERMINATED_REFERENCE);
      expect(message).toBe("Unterminated reference, missing '}'.");
    });

    it("should ignore data for string templates", () => {
      const message = getMessage(LexerErrorCode.EMPTY_VARIABLE_NAME, {
        unnecessaryProp: "value",
      });
      expect(message).toBe("Empty variable name.");
    });
  });

  describe("Function templates", () => {
    it("should interpolate data into function templates", () => {
      const message = getMessage(LexerErrorCode.INVALID_CHARACTER, {
        char: "@",
        position: 5,
      });
      expect(message).toBe("Invalid character '@' at position 5.");
    });

    it("should handle optional data in function templates", () => {
      const message = getMessage(LexerErrorCode.INVALID_CHARACTER, {
        char: "$",
        position: 10,
        description: "Special characters are not allowed",
      });
      expect(message).toBe("Invalid character '$' at position 10. Special characters are not allowed");
    });

    it("should handle function templates without data", () => {
      const message = getMessage(LexerErrorCode.INVALID_CHARACTER);
      expect(message).toContain("Invalid character");
    });

    it("should handle function templates with empty data object", () => {
      const message = getMessage(InterpreterErrorCode.VARIABLE_NOT_FOUND, {});
      expect(message).toContain("Variable");
    });

    it("should handle arrays in data", () => {
      const message = getMessage(OperationsErrorCode.CANNOT_MIX_UNITS, {
        units: ["px", "em", "rem"],
      });
      expect(message).toBe("Cannot mix units: px, em, rem");
    });
  });

  describe("Unknown error codes", () => {
    it("should return unknown error message for non-existent code", () => {
      const message = getMessage("NON_EXISTENT_ERROR_CODE");
      expect(message).toBe("Unknown error: NON_EXISTENT_ERROR_CODE");
    });

    it("should return unknown error message for empty code", () => {
      const message = getMessage("");
      expect(message).toBe("Unknown error: ");
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined data parameter", () => {
      const message = getMessage(LexerErrorCode.UNTERMINATED_REFERENCE, undefined);
      expect(message).toBe("Unterminated reference, missing '}'.");
    });

    it("should handle null values in data", () => {
      const message = getMessage(LexerErrorCode.EXPECTED_CHARACTER, {
        expected: ")",
        got: null,
      });
      expect(message).toContain("Expected character");
    });
  });
});
