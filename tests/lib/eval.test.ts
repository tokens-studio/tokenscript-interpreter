import { evaluateExpression } from "@src/lib/eval";
import { describe, expect, it } from "vitest";

describe("evaluateExpression", () => {
  it("should evaluate simple arithmetic", () => {
    const result = evaluateExpression("1 + 1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result).toBe(2);
      expect(result.resultString).toBe("2");
      expect(result.type).toBe("Number");
    }
  });

  it("should return null for empty expression", () => {
    const result = evaluateExpression("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result).toBeNull();
    }
  });

  it("should evaluate with references", () => {
    const result = evaluateExpression("x + 10", {
      references: { x: 5 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result).toBe(15);
      expect(result.resultString).toBe("15");
    }
  });

  it("should handle errors with location info", () => {
    const result = evaluateExpression("1 / 0");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    }
  });

  it("should handle string results", () => {
    const result = evaluateExpression('"hello"');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result).toBe("hello");
      expect(result.resultString).toBe("hello");
      expect(result.type).toBe("String");
    }
  });

  it("should track execution time", () => {
    const result = evaluateExpression("1 + 1");
    expect(result.executionTime).toBeGreaterThan(0);
  });

  it("should handle color symbols", () => {
    const result = evaluateExpression("#FF0000");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.type).toBe("Color.Hex");
      expect(result.resultString).toBeDefined();
    }
  });


  it("should disallow statements by default", () => {
    const result = evaluateExpression("variable x = 5; x + 1");
    expect(result.success).toBe(false);
  });

  it("should handle undefined references", () => {
    const result = evaluateExpression("unknownVar + 1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});
