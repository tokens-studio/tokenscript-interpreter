import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver.updateToken skipDependents", () => {
  it("should resolve only the changed token when skipDependents is true", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: true,
    });

    // The changed token itself should be correctly resolved
    expect(result.resolved?.toString()).toBe("100");
  });

  it("should still resolve dependents correctly when skipDependents is true", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver, tokens: initialTokens } = new TokenResolver().build(allTokens);
    expect(initialTokens.get("derived")?.toString()).toBe("20"); // 10 * 2

    // skipDependents controls cache seeding scope (performance optimization)
    // but resolve() still re-evaluates all tokens, so dependents get correct values
    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: true,
    });

    const derivedValue = result.tokens.get("derived");
    expect(derivedValue?.toString()).toBe("200"); // 100 * 2
  });

  it("should fully re-resolve dependents when skipDependents is false (default)", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: false,
    });

    expect(result.resolved?.toString()).toBe("100");
    const derivedValue = result.tokens.get("derived");
    expect(derivedValue?.toString()).toBe("200"); // 100 * 2
  });

  it("should default skipDependents to false", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // No skipDependents param — should behave as false
    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
    });

    const derivedValue = result.tokens.get("derived");
    expect(derivedValue?.toString()).toBe("200");
  });

  it("should handle deep dependency chains with skipDependents", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "1", $type: "dimension" }],
      ["b", { $value: "{a} + 1", $type: "dimension" }],
      ["c", { $value: "{b} + 1", $type: "dimension" }],
      ["d", { $value: "{c} + 1", $type: "dimension" }],
    ]);

    const { resolver, tokens: initialTokens } = new TokenResolver().build(allTokens);
    expect(initialTokens.get("d")?.toString()).toBe("4"); // 1+1+1+1

    // skipDependents seeds non-dirty tokens from cache as a warm-start,
    // but resolve() still re-evaluates all tokens in dependency order
    const result = resolver.updateToken({
      tokenPath: "a",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: true,
    });

    expect(result.resolved?.toString()).toBe("100");
    expect(result.tokens.get("b")?.toString()).toBe("101"); // 100 + 1
    expect(result.tokens.get("c")?.toString()).toBe("102"); // 101 + 1
    expect(result.tokens.get("d")?.toString()).toBe("103"); // 102 + 1
  });

  it("should not affect independent tokens regardless of skipDependents", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
      ["independent", { $value: "999", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    const result = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: true,
    });

    expect(result.tokens.get("independent")?.toString()).toBe("999");
  });

  it("should produce same results with and without skipDependents", () => {
    const tokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    // Build two independent resolvers
    const { resolver: resolverA } = new TokenResolver().build(new Map(tokens));
    const { resolver: resolverB } = new TokenResolver().build(new Map(tokens));

    const resultA = resolverA.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: true,
    });

    const resultB = resolverB.updateToken({
      tokenPath: "base",
      tokenData: { $value: "100", $type: "dimension" },
      skipDependents: false,
    });

    // Both should produce identical resolved values
    expect(resultA.resolved?.toString()).toBe(resultB.resolved?.toString());
    expect(resultA.tokens.get("derived")?.toString()).toBe(resultB.tokens.get("derived")?.toString());
  });
});
