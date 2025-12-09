import { ProcessorErrorCode } from "@interpreter/errors";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver.deleteToken", () => {
  it("should delete a simple token", () => {
    const allTokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "#00FF00", $type: "color" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "color.secondary",
    });

    expect(result.brokenReferences.size).toBe(0);
  });

  it("should throw error when token doesn't exist", () => {
    const allTokens = new Map<string, TokenData>([["color.primary", { $value: "#FF0000", $type: "color" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    expect(() => {
      resolver.deleteToken({
        tokenPath: "nonexistent",
      });
    }).toThrow();
  });

  it("should delete token and mark dependent tokens as broken", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "base",
    });

    expect(result.brokenReferences.has("derived")).toBe(true);
    expect(result.affectedTokens.has("derived")).toBe(true);
  });

  it("should handle multiple dependents", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived1", { $value: "{base} * 2", $type: "dimension" }],
      ["derived2", { $value: "{base} + 5", $type: "dimension" }],
      ["derived3", { $value: "{base} / 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "base",
    });

    expect(result.brokenReferences.has("derived1")).toBe(true);
    expect(result.brokenReferences.has("derived2")).toBe(true);
    expect(result.brokenReferences.has("derived3")).toBe(true);
    expect(result.affectedTokens.size).toBe(3);
  });

  it("should handle cascading broken references", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "10", $type: "dimension" }],
      ["b", { $value: "{a} * 2", $type: "dimension" }],
      ["c", { $value: "{b} + 5", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "a",
    });

    expect(result.brokenReferences.has("b")).toBe(true);
    expect(result.brokenReferences.has("c")).toBe(true);
    expect(result.affectedTokens.size).toBe(2);
  });

  it("should handle empty token name", () => {
    const allTokens = new Map<string, TokenData>([
      ["", { $value: "100", $type: "dimension" }],
      ["other", { $value: "200", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "",
    });

    expect(result.brokenReferences.size).toBe(0);
  });

  it("should handle whitespace-only token name as empty string", () => {
    const allTokens = new Map<string, TokenData>([
      ["", { $value: "75", $type: "dimension" }],
      ["derived", { $value: "100", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "   ",
    });

    expect(result.brokenReferences.size).toBe(0);
  });

  it("should delete token with no dependents", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["independent", { $value: "20", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "independent",
    });

    expect(result.brokenReferences.size).toBe(0);
    expect(result.affectedTokens.size).toBe(0);
  });

  it("should throw error when called before build()", () => {
    const resolver = new TokenResolver();

    expect(() => {
      resolver.deleteToken({
        tokenPath: "token",
      });
    }).toThrow("can only be called after build()");
  });

  it("should return subgraph with affected tokens", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "base",
    });

    expect(result.subgraph).toBeDefined();
    const nodes = result.subgraph.getNodes();
    expect(nodes.has("derived")).toBe(true);
  });

  it("should handle deleting token with partial dependents", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["other", { $value: "5", $type: "dimension" }],
      ["mixed", { $value: "{base} + {other}", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "base",
    });

    expect(result.brokenReferences.has("mixed")).toBe(true);
  });

  it("should not affect independent tokens", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "10", $type: "dimension" }],
      ["b", { $value: "20", $type: "dimension" }],
      ["c", { $value: "{a} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "a",
    });

    expect(result.brokenReferences.has("c")).toBe(true);
    expect(result.affectedTokens.has("b")).toBe(false);
  });

  it("should work with createToken after delete", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Delete the base token
    const deleteResult = resolver.deleteToken({
      tokenPath: "base",
    });

    expect(deleteResult.brokenReferences.has("derived")).toBe(true);

    // Re-create the base token
    const createResult = resolver.createToken({
      tokenPath: "base",
      tokenData: { $value: "15", $type: "dimension" },
    });

    expect(createResult.resolvedValue.toString()).toBe("15");
    expect(createResult.affectedTokens.has("derived")).toBe(true);
  });

  it("should work with updateToken after delete", () => {
    const allTokens = new Map<string, TokenData>([
      ["token1", { $value: "10", $type: "dimension" }],
      ["token2", { $value: "{token1} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Delete token1
    resolver.deleteToken({
      tokenPath: "token1",
    });

    // Update token2 to remove reference
    const result = resolver.updateToken({
      tokenPath: "token2",
      tokenData: { $value: "30", $type: "dimension" },
    });

    expect(result.resolvedValue.toString()).toBe("30");
  });

  it("should handle deleting in middle of dependency chain", () => {
    const allTokens = new Map<string, TokenData>([
      ["level1", { $value: "10", $type: "dimension" }],
      ["level2", { $value: "{level1} + 1", $type: "dimension" }],
      ["level3", { $value: "{level2} + 1", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "level2",
    });

    expect(result.brokenReferences.has("level3")).toBe(true);
    expect(result.affectedTokens.has("level1")).toBe(false);
  });

  it("should handle deleting leaf node in dependency tree", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "derived",
    });

    expect(result.brokenReferences.size).toBe(0);
  });

  it("should handle complex dependency graph", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "10", $type: "dimension" }],
      ["b", { $value: "{a} * 2", $type: "dimension" }],
      ["c", { $value: "{a} + 5", $type: "dimension" }],
      ["d", { $value: "{b} + {c}", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "a",
    });

    expect(result.brokenReferences.has("b")).toBe(true);
    expect(result.brokenReferences.has("c")).toBe(true);
    expect(result.brokenReferences.has("d")).toBe(true);
  });

  it("should handle deleting token referenced multiple times by same dependent", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} + {base}", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "base",
    });

    expect(result.brokenReferences.has("derived")).toBe(true);
  });

  it("should persist deletion for subsequent operations", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Delete base token
    resolver.deleteToken({
      tokenPath: "base",
    });

    // Try to create a new token that references the deleted token
    const result = resolver.createToken({
      tokenPath: "newToken",
      tokenData: { $value: "{base} * 3", $type: "dimension" },
    });

    expect(result.resolvedValue).toBeInstanceOf(Error);
  });

  it("should handle deleting multiple times (second should throw)", () => {
    const allTokens = new Map<string, TokenData>([["token", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // First delete
    const _result1 = resolver.deleteToken({
      tokenPath: "token",
    });

    // Second delete (should throw)
    expect(() => {
      resolver.deleteToken({
        tokenPath: "token",
      });
    }).toThrow();
  });

  it("should throw ProcessorError with TOKEN_NOT_FOUND when deleting non-existent token", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    try {
      resolver.deleteToken({
        tokenPath: "nonexistent",
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error && typeof error === "object" && "code" in error) {
        expect(error.code).toBe(ProcessorErrorCode.TOKEN_NOT_FOUND);
      }
    }
  });

  it("should clear reference cache for deleted token", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    resolver.deleteToken({
      tokenPath: "base",
    });

    // Try to create another token that references the deleted token
    const result = resolver.createToken({
      tokenPath: "another",
      tokenData: { $value: "{base} + 5", $type: "dimension" },
    });

    // Should have error because base is gone
    expect(result.resolvedValue).toBeInstanceOf(Error);
  });

  it("should handle deleting token with prefix children", () => {
    const allTokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "#00FF00", $type: "color" }],
      ["button.bg", { $value: "{color.primary}", $type: "color" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.deleteToken({
      tokenPath: "color.primary",
    });

    expect(result.brokenReferences.has("button.bg")).toBe(true);
  });
});
