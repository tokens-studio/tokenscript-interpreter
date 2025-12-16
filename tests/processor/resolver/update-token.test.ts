import { ProcessorErrorCode } from "@interpreter/errors";
import { getAffectedTokens } from "@src/processor/resolver/helpers";
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
    const result = resolver.updateToken({
      tokenPath: "color.primary",
      tokenData: { $value: "#0000FF", $type: "color" },
    });

    expect(result.resolved?.toString()).toBe("#0000FF");
    expect(getAffectedTokens(result).has("color.primary")).toBe(true);
    expect(result.updated).toBe(true);
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
    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "20", $type: "dimension" },
    });

    const affectedTokens = getAffectedTokens(result);
    // Should identify base and all its dependents
    expect(affectedTokens.has("base")).toBe(true);
    expect(affectedTokens.has("derived")).toBe(true);
    expect(affectedTokens.has("furtherDerived")).toBe(true);
    // Should NOT include independent token
    expect(affectedTokens.has("independent")).toBe(false);

    // Verify derived tokens have correct updated values
    expect(result.resolved?.toString()).toBe("20"); // base = 20

    // Check derived: should be 20 * 2 = 40
    const derived = resolver.updateToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * 2", $type: "dimension" },
    });
    expect(derived.resolved?.toString()).toBe("40");

    // Check furtherDerived: should be 40 + 5 = 45
    const furtherDerived = resolver.updateToken({
      tokenPath: "furtherDerived",
      tokenData: { $value: "{derived} + 5", $type: "dimension" },
    });
    expect(furtherDerived.resolved?.toString()).toBe("45");
  });

  it("should resolve token with references correctly", () => {
    const allTokens = new Map<string, TokenData>([
      ["spacing.base", { $value: "8", $type: "dimension" }],
      ["spacing.large", { $value: "{spacing.base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "spacing.large",
      tokenData: { $value: "{spacing.base} * 3", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("24");
    expect(getAffectedTokens(result).has("spacing.large")).toBe(true);
  });

  it("should handle empty token name with empty string", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "100", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "",
      tokenData: { $value: "50", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("50");
    expect(getAffectedTokens(result).has("")).toBe(true);
  });

  it("should handle whitespace-only token name as empty string", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "100", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "   ",
      tokenData: { $value: "75", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("75");
    expect(getAffectedTokens(result).has("")).toBe(true);
  });

  it("should return error in issues when token has unresolved dependencies", () => {
    const allTokens = new Map<string, TokenData>([
      ["valid", { $value: "10", $type: "dimension" }],
      ["invalid", { $value: "5", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "invalid",
      tokenData: { $value: "{nonexistent}", $type: "dimension" },
    });

    expect(result.issues?.has("invalid")).toBe(true);
  });

  it("should handle mathematical expressions", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["calculated", { $value: "{base} * 2 + 5", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "calculated",
      tokenData: { $value: "{base} * 3", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("30");
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
    const result = resolver.updateToken({
      tokenPath: "a",
      tokenData: { $value: "10", $type: "dimension" },
    });

    // All tokens should be affected
    expect(getAffectedTokens(result).size).toBe(4);
    expect(result.resolved?.toString()).toBe("10"); // a = 10

    // Verify the cascade: a=10, b=11, c=12, d=13
    const b = resolver.updateToken({
      tokenPath: "b",
      tokenData: { $value: "{a} + 1", $type: "dimension" },
    });
    expect(b.resolved?.toString()).toBe("11");

    const c = resolver.updateToken({
      tokenPath: "c",
      tokenData: { $value: "{b} + 1", $type: "dimension" },
    });
    expect(c.resolved?.toString()).toBe("12");

    const d = resolver.updateToken({
      tokenPath: "d",
      tokenData: { $value: "{c} + 1", $type: "dimension" },
    });
    expect(d.resolved?.toString()).toBe("13");
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
    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "20", $type: "dimension" },
    });

    const affectedTokens = getAffectedTokens(result);
    // Should include base and all three derived tokens
    expect(affectedTokens.size).toBe(4);
    expect(affectedTokens.has("base")).toBe(true);
    expect(affectedTokens.has("derived1")).toBe(true);
    expect(affectedTokens.has("derived2")).toBe(true);
    expect(affectedTokens.has("derived3")).toBe(true);

    // Verify all derived tokens have correct updated values
    expect(result.resolved?.toString()).toBe("20"); // base = 20

    const derived1 = resolver.updateToken({
      tokenPath: "derived1",
      tokenData: { $value: "{base} * 2", $type: "dimension" },
    });
    expect(derived1.resolved?.toString()).toBe("40"); // 20 * 2

    const derived2 = resolver.updateToken({
      tokenPath: "derived2",
      tokenData: { $value: "{base} * 3", $type: "dimension" },
    });
    expect(derived2.resolved?.toString()).toBe("60"); // 20 * 3

    const derived3 = resolver.updateToken({
      tokenPath: "derived3",
      tokenData: { $value: "{base} + 5", $type: "dimension" },
    });
    expect(derived3.resolved?.toString()).toBe("25"); // 20 + 5
  });

  it("should handle token type as undefined", () => {
    const allTokens = new Map<string, TokenData>([["token1", { $value: "test", $type: "string" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "token1",
      tokenData: { $value: "updated" },
    });

    // Should default to "string" type
    expect(result.resolved?.toString()).toBe("updated");
  });

  it("should handle adding a new token", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "newToken",
      tokenData: { $value: "20", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("20");
    expect(getAffectedTokens(result).has("newToken")).toBe(true);
    expect(result.updated).toBe(false); // Token didn't exist before
  });

  it("should handle string values without references", () => {
    const allTokens = new Map<string, TokenData>([["text", { $value: "hello", $type: "string" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "text",
      tokenData: { $value: "world", $type: "string" },
    });

    expect(result.resolved?.toString()).toBe("world");
  });

  it("should handle boolean values", () => {
    const allTokens = new Map<string, TokenData>([["flag", { $value: "true", $type: "boolean" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "flag",
      tokenData: { $value: "false", $type: "boolean" },
    });

    expect(result.resolved?.toString()).toBe("false");
  });

  it("should return dependants graph showing affected token relationships", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived1", { $value: "{base} * 2", $type: "dimension" }],
      ["derived2", { $value: "{derived1} + 5", $type: "dimension" }],
      ["independent", { $value: "100", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "20", $type: "dimension" },
    });

    // Check dependants graph is returned
    expect(result.dependants?.graph).toBeDefined();
    const nodes = result.dependants!.graph.getNodes();

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
    const result = resolver.updateToken({
      tokenPath: "button.bg",
      tokenData: { $value: "{color.primary}", $type: "color" },
    });

    // Should resolve to the referenced value
    expect(result.resolved?.toString()).toBe("#FF0000");
    expect(getAffectedTokens(result).has("button.bg")).toBe(true);
  });

  it("should handle changing from literal value to reference", () => {
    const allTokens = new Map<string, TokenData>([
      ["spacing.base", { $value: "8", $type: "dimension" }],
      ["spacing.large", { $value: "16", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Change spacing.large from literal to reference
    const result = resolver.updateToken({
      tokenPath: "spacing.large",
      tokenData: { $value: "{spacing.base} * 2", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("16");
    expect(getAffectedTokens(result).size).toBe(1);
  });

  it("should detect circular dependency when updating creates a cycle", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "{b} + 1", $type: "dimension" }],
      ["b", { $value: "10", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Try to create circular dependency: b -> a -> b
    // Should return issues for circular dependency instead of throwing
    const result = resolver.updateToken({
      tokenPath: "b",
      tokenData: { $value: "{a} + 1", $type: "dimension" },
    });

    // Should have issues for tokens in the cycle
    expect(result.issues).toBeDefined();

    // Check that at least one token has a circular dependency error
    const hasCircularError = Array.from(result.issues!.entries()).some(([_tokenName, issues]) =>
      issues.some((issue) => "code" in issue && issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY),
    );
    expect(hasCircularError).toBe(true);
  });

  it("should not loop forever on self-reference", () => {
    const allTokens = new Map<string, TokenData>([["recursive", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Try to create self-reference
    // Should return issues for circular dependency, not loop forever or throw
    const result = resolver.updateToken({
      tokenPath: "recursive",
      tokenData: { $value: "{recursive}", $type: "dimension" },
    });

    // Should have issues for the circular dependency
    expect(result.issues).toBeDefined();
    expect(result.issues?.has("recursive")).toBe(true);

    // Check that the issue is specifically a circular dependency error
    const recursiveIssues = result.issues?.get("recursive");
    expect(recursiveIssues).toBeDefined();
    const circularError = recursiveIssues?.find((issue) => "code" in issue && issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    expect(circularError).toBeDefined();
  });

  it("should handle complex circular dependency creation", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "{b}", $type: "dimension" }],
      ["b", { $value: "{c}", $type: "dimension" }],
      ["c", { $value: "10", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Create cycle: c -> a -> b -> c
    // Should return issues for circular dependency instead of throwing
    const result = resolver.updateToken({
      tokenPath: "c",
      tokenData: { $value: "{a}", $type: "dimension" },
    });

    // Should have issues for tokens in the cycle
    expect(result.issues).toBeDefined();
    expect(result.issues!.size).toBeGreaterThan(0);

    // Check that at least one token has a circular dependency error
    const hasCircularError = Array.from(result.issues!.entries()).some(([_tokenName, issues]) =>
      issues.some((issue) => "code" in issue && issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY),
    );
    expect(hasCircularError).toBe(true);
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
    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
    });

    const affectedTokens = getAffectedTokens(result);
    // All affected tokens should be identified
    expect(affectedTokens.size).toBe(4);
    expect(affectedTokens.has("base")).toBe(true);
    expect(affectedTokens.has("level1a")).toBe(true);
    expect(affectedTokens.has("level1b")).toBe(true);
    expect(affectedTokens.has("level2")).toBe(true);

    // Now check that ALL dependent values are correct after this ONE update
    // No need to call updateToken again for each dependent
    const level1a = resolver.updateToken({
      tokenPath: "level1a",
      tokenData: { $value: "{base} * 2", $type: "dimension" },
    });
    expect(level1a.resolved?.toString()).toBe("200"); // 100 * 2

    const level1b = resolver.updateToken({
      tokenPath: "level1b",
      tokenData: { $value: "{base} + 5", $type: "dimension" },
    });
    expect(level1b.resolved?.toString()).toBe("105"); // 100 + 5

    const level2 = resolver.updateToken({
      tokenPath: "level2",
      tokenData: { $value: "{level1a} + {level1b}", $type: "dimension" },
    });
    expect(level2.resolved?.toString()).toBe("305"); // 200 + 105
  });
});
