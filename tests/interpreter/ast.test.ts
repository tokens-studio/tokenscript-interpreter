import { collectReferenceNodes, filterAST, ReferenceNode } from "@interpreter/ast";
import { parseExpression } from "@interpreter/parser";
import { describe, expect, it } from "vitest";

describe("filterAST", () => {
  it("should find all reference nodes", () => {
    const expr = "{base} * 2 + {offset}";
    const result = parseExpression(expr);

    const refs = filterAST<ReferenceNode>(result.ast!, (node) => node instanceof ReferenceNode);

    expect(refs).toHaveLength(2);
    expect(refs[0].value).toBe("base");
    expect(refs[1].value).toBe("offset");
  });

  it("should find references to a specific token", () => {
    const expr = "{color.primary} + {color.secondary} + {color.primary}";
    const result = parseExpression(expr);

    const refs = filterAST<ReferenceNode>(result.ast!, (node) => node instanceof ReferenceNode && node.value === "color.primary");

    expect(refs).toHaveLength(2);
    expect(refs[0].value).toBe("color.primary");
    expect(refs[1].value).toBe("color.primary");
  });

  it("should find references in nested function calls", () => {
    const expr = "max(min({a}, {b}), {c})";
    const result = parseExpression(expr);

    const refs = filterAST<ReferenceNode>(result.ast!, (node) => node instanceof ReferenceNode);

    expect(refs).toHaveLength(3);
    expect(refs[0].value).toBe("a");
    expect(refs[1].value).toBe("b");
    expect(refs[2].value).toBe("c");
  });

  it("should find references in complex expressions", () => {
    const expr = "{x} + {y} * {z}";
    const result = parseExpression(expr);

    const refs = filterAST<ReferenceNode>(result.ast!, (node) => node instanceof ReferenceNode);

    expect(refs).toHaveLength(3);
    expect(refs[0].value).toBe("x");
    expect(refs[1].value).toBe("y");
    expect(refs[2].value).toBe("z");
  });

  it("should return empty array when no matches found", () => {
    const expr = "10 + 20";
    const result = parseExpression(expr);

    const refs = filterAST<ReferenceNode>(result.ast!, (node) => node instanceof ReferenceNode);

    expect(refs).toHaveLength(0);
  });

  it("should include token positions for references", () => {
    const expr = "{color.primary}";
    const result = parseExpression(expr);

    const refs = filterAST<ReferenceNode>(result.ast!, (node) => node instanceof ReferenceNode);

    expect(refs).toHaveLength(1);
    expect(refs[0].token.pos).toBe(1);
    expect(refs[0].token.endPos).toBe(14);
    expect(refs[0].value).toBe("color.primary");
  });
});

describe("collectReferenceNodes", () => {
  it("should collect all reference nodes", () => {
    const expr = "{base} * 2 + {offset}";
    const result = parseExpression(expr);

    const refs = collectReferenceNodes(result.ast!);

    expect(refs).toHaveLength(2);
    expect(refs[0].value).toBe("base");
    expect(refs[1].value).toBe("offset");
  });

  it("should filter by target name when provided", () => {
    const expr = "{color.primary} + {color.secondary} + {color.primary}";
    const result = parseExpression(expr);

    const refs = collectReferenceNodes(result.ast!, "color.primary");

    expect(refs).toHaveLength(2);
    expect(refs[0].value).toBe("color.primary");
    expect(refs[1].value).toBe("color.primary");
  });

  it("should return empty array when no references exist", () => {
    const expr = "10 + 20";
    const result = parseExpression(expr);

    const refs = collectReferenceNodes(result.ast!);

    expect(refs).toHaveLength(0);
  });

  it("should include token positions", () => {
    const expr = "{color.primary}";
    const result = parseExpression(expr);

    const refs = collectReferenceNodes(result.ast!);

    expect(refs).toHaveLength(1);
    expect(refs[0].token.pos).toBe(1);
    expect(refs[0].token.endPos).toBe(14);
    expect(refs[0].value).toBe("color.primary");
  });

  it("should find multiple occurrences of same reference", () => {
    const expr = "{x} + {x} * {x}";
    const result = parseExpression(expr);

    const refs = collectReferenceNodes(result.ast!, "x");

    expect(refs).toHaveLength(3);
    expect(refs.every((ref) => ref.value === "x")).toBe(true);
  });
});
