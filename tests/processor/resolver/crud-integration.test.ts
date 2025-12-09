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
    expect(createResult.resolvedValue.toString()).toBe("2");

    // CREATE: Add a dependent token
    const derivedResult = resolver.createToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * {multiplier}", $type: "dimension" },
    });
    expect(derivedResult.created).toBe(true);
    expect(derivedResult.resolvedValue.toString()).toBe("20");

    // UPDATE: Modify the base token
    const updateResult = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "15", $type: "dimension" },
    });
    expect(updateResult.updated).toBe(true);
    expect(updateResult.resolvedValue.toString()).toBe("15");
    expect(updateResult.affectedTokens.has("derived")).toBe(true);

    // DELETE: Remove the multiplier token
    const deleteResult = resolver.deleteToken({
      tokenPath: "multiplier",
    });

    expect(deleteResult.brokenReferences.has("derived")).toBe(true);

    // CREATE: Re-create the deleted token with new value
    const recreateResult = resolver.createToken({
      tokenPath: "multiplier",
      tokenData: { $value: "3", $type: "dimension" },
    });
    expect(recreateResult.created).toBe(true);
    expect(recreateResult.affectedTokens.has("derived")).toBe(true);
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

    expect(deleteResult.brokenReferences.size).toBe(2);

    // Fix 'b' by updating to a constant
    const updateB = resolver.updateToken({
      tokenPath: "b",
      tokenData: { $value: "50", $type: "dimension" },
    });
    expect(updateB.resolvedValue.toString()).toBe("50");

    // Fix 'c' by updating to a constant
    const updateC = resolver.updateToken({
      tokenPath: "c",
      tokenData: { $value: "75", $type: "dimension" },
    });
    expect(updateC.resolvedValue.toString()).toBe("75");
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
    expect(create1.resolvedValue.toString()).toBe("100");

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
    expect(create2.resolvedValue.toString()).toBe("200");
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

    expect(deleteResult.brokenReferences.has("c")).toBe(true);
    expect(deleteResult.brokenReferences.has("d")).toBe(true);
    expect(deleteResult.affectedTokens.size).toBe(2);

    // Re-create 'b' with a constant (breaking dependency on 'a')
    const createResult = resolver.createToken({
      tokenPath: "b",
      tokenData: { $value: "30", $type: "dimension" },
    });
    expect(createResult.created).toBe(true);
    expect(createResult.affectedTokens.has("c")).toBe(true);
    expect(createResult.affectedTokens.has("d")).toBe(true);
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
    expect(updateResult.resolvedValue.toString()).toBe("20");

    // Delete base
    const deleteResult = resolver.deleteToken({
      tokenPath: "base",
    });
    expect(deleteResult.brokenReferences.has("derived")).toBe(true);

    // Create a new base token
    const createResult = resolver.createToken({
      tokenPath: "base",
      tokenData: { $value: "30", $type: "dimension" },
    });
    expect(createResult.affectedTokens.has("derived")).toBe(true);
  });

  it("should handle create, delete, create cycle", () => {
    const allTokens = new Map<string, TokenData>([["missing", { $value: "{nonexistent}", $type: "dimension" }]]);

    const { resolver, errors } = new TokenResolver().build(allTokens);
    expect(errors.has("missing")).toBe(true);

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
    expect(deleteResult.brokenReferences.has("missing")).toBe(true);

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
    expect(deleteResult.brokenReferences.has("tree1.child")).toBe(true);
    expect(deleteResult.affectedTokens.has("tree2.root")).toBe(false);
    expect(deleteResult.affectedTokens.has("tree2.child")).toBe(false);

    // Update tree2
    const updateResult = resolver.updateToken({
      tokenPath: "tree2.root",
      tokenData: { $value: "30", $type: "dimension" },
    });
    expect(updateResult.affectedTokens.has("tree2.child")).toBe(true);
    expect(updateResult.affectedTokens.has("tree1.child")).toBe(false);

    // Create new token in tree1
    const createResult = resolver.createToken({
      tokenPath: "tree1.root",
      tokenData: { $value: "15", $type: "dimension" },
    });
    expect(createResult.affectedTokens.has("tree1.child")).toBe(true);
    expect(createResult.affectedTokens.has("tree2.child")).toBe(false);
  });
});
