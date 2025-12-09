import { parseExpression } from "@interpreter/parser";
import { renameReferences } from "@interpreter/utils/references";
import { describe, expect, it } from "vitest";

describe("renameReferences", () => {
  it("should rename a single reference", () => {
    const original = "{color.primary}";
    const { ast } = parseExpression(original);
    const renameMap = { "color.primary": "color.main" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{color.main}");
  });

  it("should rename multiple occurrences of the same reference", () => {
    const original = "{x} + {x} * {x}";
    const { ast } = parseExpression(original);
    const renameMap = { x: "y" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{y} + {y} * {y}");
  });

  it("should rename multiple different references", () => {
    const original = "{a} + {b}";
    const { ast } = parseExpression(original);
    const renameMap = { a: "x", b: "y" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{x} + {y}");
  });

  it("should leave unrenamed references unchanged", () => {
    const original = "{a} + {b} + {c}";
    const { ast } = parseExpression(original);
    const renameMap = { a: "x" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{x} + {b} + {c}");
  });

  it("should handle references in function calls", () => {
    const original = "max({value}, 10)";
    const { ast } = parseExpression(original);
    const renameMap = { value: "number" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("max({number}, 10)");
  });

  it("should handle nested function calls", () => {
    const original = "max(min({a}, {b}), {c})";
    const { ast } = parseExpression(original);
    const renameMap = { a: "x", b: "y", c: "z" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("max(min({x}, {y}), {z})");
  });

  it("should handle complex expressions", () => {
    const original = "{spacing.base} * 2 + 4";
    const { ast } = parseExpression(original);
    const renameMap = { "spacing.base": "spacing.unit" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{spacing.unit} * 2 + 4");
  });

  it("should return original string when no references match", () => {
    const original = "{a} + {b}";
    const { ast } = parseExpression(original);
    const renameMap = { c: "d" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe(original);
  });

  it("should return original string when rename map is empty", () => {
    const original = "{a} + {b}";
    const { ast } = parseExpression(original);
    const renameMap = {};

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe(original);
  });

  it("should handle references without affecting surrounding spaces", () => {
    const original = "{color.primary} + {color.secondary}";
    const { ast } = parseExpression(original);
    const renameMap = { "color.primary": "color.main" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{color.main} + {color.secondary}");
  });

  it("should handle references with dots in names", () => {
    const original = "{size.spacing.xs} * 2";
    const { ast } = parseExpression(original);
    const renameMap = { "size.spacing.xs": "size.spacing.extraSmall" };

    const result = renameReferences(original, ast!, renameMap);

    expect(result).toBe("{size.spacing.extraSmall} * 2");
  });
});
