import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver.updateToken", () => {
  it("should update a simple token and return resolved value", () => {
    const allTokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "#00FF00", $type: "color" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("color.primary", "#0000FF", "color");

    expect(result.resolvedValue.toString()).toBe("#0000FF");
    expect(result.affectedTokens.has("color.primary")).toBe(true);
  });

  it("should identify all transitively affected tokens", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
      ["furtherDerived", { $value: "{derived} + 5", $type: "dimension" }],
      ["independent", { $value: "100", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Update base from 10 to 20
    const result = resolver.updateToken("base", "20", "dimension");

    // Should identify base and all its dependents
    expect(result.affectedTokens.has("base")).toBe(true);
    expect(result.affectedTokens.has("derived")).toBe(true);
    expect(result.affectedTokens.has("furtherDerived")).toBe(true);
    // Should NOT include independent token
    expect(result.affectedTokens.has("independent")).toBe(false);

    // Verify derived tokens have correct updated values
    expect(result.resolvedValue.toString()).toBe("20"); // base = 20

    // Check derived: should be 20 * 2 = 40
    const derived = resolver.updateToken("derived", "{base} * 2", "dimension");
    expect(derived.resolvedValue.toString()).toBe("40");

    // Check furtherDerived: should be 40 + 5 = 45
    const furtherDerived = resolver.updateToken("furtherDerived", "{derived} + 5", "dimension");
    expect(furtherDerived.resolvedValue.toString()).toBe("45");
  });

  it("should resolve token with references correctly", () => {
    const allTokens = new Map<string, TokenData>([
      ["spacing.base", { $value: "8", $type: "dimension" }],
      ["spacing.large", { $value: "{spacing.base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("spacing.large", "{spacing.base} * 3", "dimension");

    expect(result.resolvedValue.toString()).toBe("24");
    expect(result.affectedTokens.has("spacing.large")).toBe(true);
  });

  it("should handle empty token name with empty string", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "100", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("", "50", "dimension");

    expect(result.resolvedValue.toString()).toBe("50");
    expect(result.affectedTokens.has("")).toBe(true);
  });

  it("should handle whitespace-only token name as empty string", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "100", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("   ", "75", "dimension");

    expect(result.resolvedValue.toString()).toBe("75");
    expect(result.affectedTokens.has("")).toBe(true);
  });

  it("should return error when token has unresolved dependencies", () => {
    const allTokens = new Map<string, TokenData>([["valid", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("invalid", "{nonexistent}", "dimension");

    expect(result.resolvedValue).toBeInstanceOf(Error);
  });

  it("should handle mathematical expressions", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["calculated", { $value: "{base} * 2 + 5", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("calculated", "{base} * 3", "dimension");

    expect(result.resolvedValue.toString()).toBe("30");
  });

  it("should handle complex dependency chains", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "1", $type: "dimension" }],
      ["b", { $value: "{a} + 1", $type: "dimension" }],
      ["c", { $value: "{b} + 1", $type: "dimension" }],
      ["d", { $value: "{c} + 1", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Update a from 1 to 10
    const result = resolver.updateToken("a", "10", "dimension");

    // All tokens should be affected
    expect(result.affectedTokens.size).toBe(4);
    expect(result.resolvedValue.toString()).toBe("10"); // a = 10

    // Verify the cascade: a=10, b=11, c=12, d=13
    const b = resolver.updateToken("b", "{a} + 1", "dimension");
    expect(b.resolvedValue.toString()).toBe("11");

    const c = resolver.updateToken("c", "{b} + 1", "dimension");
    expect(c.resolvedValue.toString()).toBe("12");

    const d = resolver.updateToken("d", "{c} + 1", "dimension");
    expect(d.resolvedValue.toString()).toBe("13");
  });

  it("should handle multiple dependents correctly", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived1", { $value: "{base} * 2", $type: "dimension" }],
      ["derived2", { $value: "{base} * 3", $type: "dimension" }],
      ["derived3", { $value: "{base} + 5", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Update base from 10 to 20
    const result = resolver.updateToken("base", "20", "dimension");

    // Should include base and all three derived tokens
    expect(result.affectedTokens.size).toBe(4);
    expect(result.affectedTokens.has("base")).toBe(true);
    expect(result.affectedTokens.has("derived1")).toBe(true);
    expect(result.affectedTokens.has("derived2")).toBe(true);
    expect(result.affectedTokens.has("derived3")).toBe(true);

    // Verify all derived tokens have correct updated values
    expect(result.resolvedValue.toString()).toBe("20"); // base = 20

    const derived1 = resolver.updateToken("derived1", "{base} * 2", "dimension");
    expect(derived1.resolvedValue.toString()).toBe("40"); // 20 * 2

    const derived2 = resolver.updateToken("derived2", "{base} * 3", "dimension");
    expect(derived2.resolvedValue.toString()).toBe("60"); // 20 * 3

    const derived3 = resolver.updateToken("derived3", "{base} + 5", "dimension");
    expect(derived3.resolvedValue.toString()).toBe("25"); // 20 + 5
  });

  it("should handle token type as undefined", () => {
    const allTokens = new Map<string, TokenData>([["token1", { $value: "test", $type: "string" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("token1", "updated");

    // Should default to "string" type
    expect(result.resolvedValue.toString()).toBe("updated");
  });

  it("should handle adding a new token", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("newToken", "20", "dimension");

    expect(result.resolvedValue.toString()).toBe("20");
    expect(result.affectedTokens.has("newToken")).toBe(true);
  });

  it("should handle string values without references", () => {
    const allTokens = new Map<string, TokenData>([["text", { $value: "hello", $type: "string" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("text", "world", "string");

    expect(result.resolvedValue.toString()).toBe("world");
  });

  it("should handle boolean values", () => {
    const allTokens = new Map<string, TokenData>([["flag", { $value: "true", $type: "boolean" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("flag", "false", "boolean");

    expect(result.resolvedValue.toString()).toBe("false");
  });

  it("should return subgraph showing affected token relationships", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived1", { $value: "{base} * 2", $type: "dimension" }],
      ["derived2", { $value: "{derived1} + 5", $type: "dimension" }],
      ["independent", { $value: "100", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken("base", "20", "dimension");

    // Check subgraph is returned
    expect(result.subgraph).toBeDefined();
    const nodes = result.subgraph.getNodes();

    // Should only contain affected tokens
    expect(nodes.size).toBe(3);
    expect(nodes.has("base")).toBe(true);
    expect(nodes.has("derived1")).toBe(true);
    expect(nodes.has("derived2")).toBe(true);
    expect(nodes.has("independent")).toBe(false);

    // Check dependency relationships
    expect(nodes.get("derived1")?.has("base")).toBe(true);
    expect(nodes.get("derived2")?.has("derived1")).toBe(true);
  });

  it("should handle updating a token value to reference another token", () => {
    const allTokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "#00FF00", $type: "color" }],
      ["button.bg", { $value: "{color.secondary}", $type: "color" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Change button.bg to reference color.primary instead
    const result = resolver.updateToken("button.bg", "{color.primary}", "color");

    // Should resolve to the referenced value
    expect(result.resolvedValue.toString()).toBe("#FF0000");
    expect(result.affectedTokens.has("button.bg")).toBe(true);
  });

  it("should handle changing from literal value to reference", () => {
    const allTokens = new Map<string, TokenData>([
      ["spacing.base", { $value: "8", $type: "dimension" }],
      ["spacing.large", { $value: "16", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Change spacing.large from literal to reference
    const result = resolver.updateToken("spacing.large", "{spacing.base} * 2", "dimension");

    expect(result.resolvedValue.toString()).toBe("16");
    expect(result.affectedTokens.size).toBe(1);
  });

  it("should detect circular dependency when updating creates a cycle", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "{b} + 1", $type: "dimension" }],
      ["b", { $value: "10", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Try to create circular dependency: b -> a -> b
    // Should throw ProcessorError for circular dependency
    expect(() => {
      resolver.updateToken("b", "{a} + 1", "dimension");
    }).toThrow("Circular dependency");
  });

  it("should not loop forever on self-reference", () => {
    const allTokens = new Map<string, TokenData>([["recursive", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Try to create self-reference
    // Should throw ProcessorError, not loop forever
    expect(() => {
      resolver.updateToken("recursive", "{recursive}", "dimension");
    }).toThrow("Circular dependency");
  });

  it("should handle complex circular dependency creation", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "{b}", $type: "dimension" }],
      ["b", { $value: "{c}", $type: "dimension" }],
      ["c", { $value: "10", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Create cycle: c -> a -> b -> c
    // Should throw ProcessorError for circular dependency
    expect(() => {
      resolver.updateToken("c", "{a}", "dimension");
    }).toThrow("Circular dependency");
  });

  it("should automatically update all dependents in a single updateToken call", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["level1a", { $value: "{base} * 2", $type: "dimension" }],
      ["level1b", { $value: "{base} + 5", $type: "dimension" }],
      ["level2", { $value: "{level1a} + {level1b}", $type: "dimension" }],
    ]);

    const { resolver, tokens: initialTokens } = new TokenResolver().build(allTokens);

    // Verify initial values
    expect(initialTokens.get("base")?.toString()).toBe("10");
    expect(initialTokens.get("level1a")?.toString()).toBe("20"); // 10 * 2
    expect(initialTokens.get("level1b")?.toString()).toBe("15"); // 10 + 5
    expect(initialTokens.get("level2")?.toString()).toBe("35"); // 20 + 15

    // Update base from 10 to 100 in ONE call
    const result = resolver.updateToken("base", "100", "dimension");

    // All affected tokens should be identified
    expect(result.affectedTokens.size).toBe(4);
    expect(result.affectedTokens.has("base")).toBe(true);
    expect(result.affectedTokens.has("level1a")).toBe(true);
    expect(result.affectedTokens.has("level1b")).toBe(true);
    expect(result.affectedTokens.has("level2")).toBe(true);

    // Now check that ALL dependent values are correct after this ONE update
    // No need to call updateToken again for each dependent
    const level1a = resolver.updateToken("level1a", "{base} * 2", "dimension");
    expect(level1a.resolvedValue.toString()).toBe("200"); // 100 * 2

    const level1b = resolver.updateToken("level1b", "{base} + 5", "dimension");
    expect(level1b.resolvedValue.toString()).toBe("105"); // 100 + 5

    const level2 = resolver.updateToken("level2", "{level1a} + {level1b}", "dimension");
    expect(level2.resolvedValue.toString()).toBe("305"); // 200 + 105
  });
});
