import { getAffectedTokens, getBrokenReferences } from "@src/processor/resolver/helpers";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("CRUD Integration Tests", () => {
  it("should perform full CRUD lifecycle", () => {
    const allTokens = new Map<string, TokenData>([["base", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // CREATE: Add a new token
    const createResult = resolver.createToken({
      tokenPath: "multiplier",
      tokenData: { $value: "2", $type: "dimension" },
    });
    expect(createResult.created).toBe(true);
    expect(createResult.resolved?.toString()).toBe("2");

    // CREATE: Add a dependent token
    const derivedResult = resolver.createToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * {multiplier}", $type: "dimension" },
    });
    expect(derivedResult.created).toBe(true);
    expect(derivedResult.resolved?.toString()).toBe("20");

    // UPDATE: Modify the base token
    const updateResult = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "15", $type: "dimension" },
    });
    expect(updateResult.updated).toBe(true);
    expect(updateResult.resolved?.toString()).toBe("15");
    expect(getAffectedTokens(updateResult).has("derived")).toBe(true);

    // DELETE: Remove the multiplier token
    const deleteResult = resolver.deleteToken({
      tokenPath: "multiplier",
    });

    expect(getBrokenReferences(deleteResult).has("derived")).toBe(true);

    // CREATE: Re-create the deleted token with new value
    const recreateResult = resolver.createToken({
      tokenPath: "multiplier",
      tokenData: { $value: "3", $type: "dimension" },
    });
    expect(recreateResult.created).toBe(true);
    expect(getAffectedTokens(recreateResult).has("derived")).toBe(true);
  });

  it("should handle delete → update pattern", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "10", $type: "dimension" }],
      ["b", { $value: "{a} * 2", $type: "dimension" }],
      ["c", { $value: "{a} + 5", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Delete 'a', breaking both 'b' and 'c'
    const deleteResult = resolver.deleteToken({
      tokenPath: "a",
    });

    const brokenRefs = getBrokenReferences(deleteResult);
    expect(brokenRefs.has("b")).toBe(true);
    expect(brokenRefs.has("c")).toBe(true);

    // Fix 'b' by updating to a constant
    const updateB = resolver.updateToken({
      tokenPath: "b",
      tokenData: { $value: "50", $type: "dimension" },
    });
    expect(updateB.resolved?.toString()).toBe("50");

    // Fix 'c' by updating to a constant
    const updateC = resolver.updateToken({
      tokenPath: "c",
      tokenData: { $value: "75", $type: "dimension" },
    });
    expect(updateC.resolved?.toString()).toBe("75");
  });

  it("should handle create → delete → create pattern", () => {
    const allTokens = new Map<string, TokenData>([]);
    const { resolver } = new TokenResolver().build(allTokens);

    // Create a token
    const create1 = resolver.createToken({
      tokenPath: "token",
      tokenData: { $value: "100", $type: "dimension" },
    });
    expect(create1.created).toBe(true);
    expect(create1.resolved?.toString()).toBe("100");

    // Delete it
    const _deleteResult = resolver.deleteToken({
      tokenPath: "token",
    });

    // Try to delete again (should throw)
    expect(() => {
      resolver.deleteToken({
        tokenPath: "token",
      });
    }).toThrow();

    // Re-create with different value
    const create2 = resolver.createToken({
      tokenPath: "token",
      tokenData: { $value: "200", $type: "dimension" },
    });
    expect(create2.created).toBe(true);
    expect(create2.resolved?.toString()).toBe("200");
  });

  it("should handle complex dependency management", () => {
    const allTokens = new Map<string, TokenData>([
      ["a", { $value: "10", $type: "dimension" }],
      ["b", { $value: "{a} * 2", $type: "dimension" }],
      ["c", { $value: "{b} + 5", $type: "dimension" }],
      ["d", { $value: "{c} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Delete 'b', which breaks 'c' and 'd'
    const deleteResult = resolver.deleteToken({
      tokenPath: "b",
    });

    const brokenRefs = getBrokenReferences(deleteResult);
    expect(brokenRefs.has("c")).toBe(true);
    expect(brokenRefs.has("d")).toBe(true);
    expect(getAffectedTokens(deleteResult).size).toBe(2);

    // Re-create 'b' with a constant (breaking dependency on 'a')
    const createResult = resolver.createToken({
      tokenPath: "b",
      tokenData: { $value: "30", $type: "dimension" },
    });
    expect(createResult.created).toBe(true);
    const createAffected = getAffectedTokens(createResult);
    expect(createAffected.has("c")).toBe(true);
    expect(createAffected.has("d")).toBe(true);
  });

  it("should handle multiple creates and deletes", () => {
    const allTokens = new Map<string, TokenData>([]);
    const { resolver } = new TokenResolver().build(allTokens);

    // Create multiple tokens
    const tokens = ["token1", "token2", "token3", "token4"];
    for (const tokenPath of tokens) {
      const result = resolver.createToken({
        tokenPath,
        tokenData: { $value: "100", $type: "dimension" },
      });
      expect(result.created).toBe(true);
    }

    // Delete every other token
    for (let i = 0; i < tokens.length; i += 2) {
      const _result = resolver.deleteToken({
        tokenPath: tokens[i],
      });
    }

    // Try to delete non-existent tokens (should throw)
    for (let i = 0; i < tokens.length; i += 2) {
      expect(() => {
        resolver.deleteToken({
          tokenPath: tokens[i],
        });
      }).toThrow();
    }

    // Create new tokens in the deleted slots
    for (let i = 0; i < tokens.length; i += 2) {
      const result = resolver.createToken({
        tokenPath: tokens[i],
        tokenData: { $value: "200", $type: "dimension" },
      });
      expect(result.created).toBe(true);
    }
  });

  it("should handle update → delete → create pattern with dependencies", () => {
    const allTokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Update base
    const updateResult = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "20", $type: "dimension" },
    });
    expect(updateResult.resolved?.toString()).toBe("20");

    // Delete base
    const deleteResult = resolver.deleteToken({
      tokenPath: "base",
    });
    expect(getBrokenReferences(deleteResult).has("derived")).toBe(true);

    // Create a new base token
    const createResult = resolver.createToken({
      tokenPath: "base",
      tokenData: { $value: "30", $type: "dimension" },
    });
    expect(getAffectedTokens(createResult).has("derived")).toBe(true);
  });

  it("should handle create, delete, create cycle", () => {
    const allTokens = new Map<string, TokenData>([["missing", { $value: "{nonexistent}", $type: "dimension" }]]);

    const { resolver, issues } = new TokenResolver().build(allTokens);
    expect(issues?.has("missing")).toBe(true);

    // Create the missing token
    const createResult = resolver.createToken({
      tokenPath: "nonexistent",
      tokenData: { $value: "42", $type: "dimension" },
    });
    expect(createResult.created).toBe(true);

    // Delete it again
    const deleteResult = resolver.deleteToken({
      tokenPath: "nonexistent",
    });
    expect(getBrokenReferences(deleteResult).has("missing")).toBe(true);

    // Create it again
    const recreateResult = resolver.createToken({
      tokenPath: "nonexistent",
      tokenData: { $value: "100", $type: "dimension" },
    });
    expect(recreateResult.created).toBe(true);
  });

  it("should handle independent operations on different token trees", () => {
    const allTokens = new Map<string, TokenData>([
      ["tree1.root", { $value: "10", $type: "dimension" }],
      ["tree1.child", { $value: "{tree1.root} * 2", $type: "dimension" }],
      ["tree2.root", { $value: "20", $type: "dimension" }],
      ["tree2.child", { $value: "{tree2.root} * 2", $type: "dimension" }],
    ]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Delete from tree1
    const deleteResult = resolver.deleteToken({
      tokenPath: "tree1.root",
    });
    const deleteAffected = getAffectedTokens(deleteResult);
    expect(getBrokenReferences(deleteResult).has("tree1.child")).toBe(true);
    expect(deleteAffected.has("tree2.root")).toBe(false);
    expect(deleteAffected.has("tree2.child")).toBe(false);

    // Update tree2
    const updateResult = resolver.updateToken({
      tokenPath: "tree2.root",
      tokenData: { $value: "30", $type: "dimension" },
    });
    const updateAffected = getAffectedTokens(updateResult);
    expect(updateAffected.has("tree2.child")).toBe(true);
    expect(updateAffected.has("tree1.child")).toBe(false);

    // Create new token in tree1
    const createResult = resolver.createToken({
      tokenPath: "tree1.root",
      tokenData: { $value: "15", $type: "dimension" },
    });
    const createAffected = getAffectedTokens(createResult);
    expect(createAffected.has("tree1.child")).toBe(true);
    expect(createAffected.has("tree2.child")).toBe(false);
  });
});
