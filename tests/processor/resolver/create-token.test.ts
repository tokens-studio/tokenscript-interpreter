import { ProcessorErrorCode } from "@interpreter/errors";
import { getAffectedTokens } from "@src/processor/resolver/helpers";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver.createToken", () => {
  it("should create a simple token and return resolved value", () => {
    const allTokens = new Map<string, TokenData>([["color.primary", { $value: "#FF0000", $type: "color" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "color.secondary",
      tokenData: { $value: "#00FF00", $type: "color" },
    });

    expect(result.resolved?.toString()).toBe("#00FF00");
    expect(getAffectedTokens(result).has("color.secondary")).toBe(true);
    expect(result.created).toBe(true);
  });

  it("should throw error when token already exists", () => {
    const allTokens = new Map<string, TokenData>([["color.primary", { $value: "#FF0000", $type: "color" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    expect(() => {
      resolver.createToken({
        tokenPath: "color.primary",
        tokenData: { $value: "#0000FF", $type: "color" },
      });
    }).toThrow("already exists");
  });

  it("should throw ProcessorError with correct error code when token exists", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    try {
      resolver.createToken({
        tokenPath: "existing",
        tokenData: { $value: "20", $type: "dimension" },
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toHaveProperty("code", ProcessorErrorCode.TOKEN_ALREADY_EXISTS);
    }
  });

  it("should create token with reference to existing token", () => {
    const allTokens = new Map<string, TokenData>([["base", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * 2", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("20");
    expect(getAffectedTokens(result).has("derived")).toBe(true);
  });

  it("should return error in issues when new token has unresolved dependencies", () => {
    const allTokens = new Map<string, TokenData>([["valid", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "invalid",
      tokenData: { $value: "{nonexistent}", $type: "dimension" },
    });

    expect(result.issues?.has("invalid")).toBe(true);
    expect(result.created).toBe(true);
  });

  it("should handle empty token name", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "100", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "",
      tokenData: { $value: "50", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("50");
    expect(getAffectedTokens(result).has("")).toBe(true);
    expect(result.created).toBe(true);
  });

  it("should handle whitespace-only token name as empty string", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "100", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "   ",
      tokenData: { $value: "75", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("75");
    expect(getAffectedTokens(result).has("")).toBe(true);
  });

  it("should create token without tracking previously broken references", () => {
    const allTokens = new Map<string, TokenData>([["derived", { $value: "{base} * 2", $type: "dimension" }]]);

    // Build with broken reference
    const { resolver, issues } = new TokenResolver().build(allTokens);
    expect(issues?.has("derived")).toBe(true);

    // Create the missing token
    const result = resolver.createToken({
      tokenPath: "base",
      tokenData: { $value: "10", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("10");
    expect(getAffectedTokens(result).has("base")).toBe(true);
    // Note: We don't track that 'derived' was fixed - that's ok
  });

  it("should create token with multiple broken references in the system", () => {
    const allTokens = new Map<string, TokenData>([
      ["derived1", { $value: "{base} * 2", $type: "dimension" }],
      ["derived2", { $value: "{base} + 5", $type: "dimension" }],
      ["derived3", { $value: "{base} / 2", $type: "dimension" }],
    ]);

    // Build with broken references
    const { resolver, issues } = new TokenResolver().build(allTokens);
    expect(issues?.has("derived1")).toBe(true);
    expect(issues?.has("derived2")).toBe(true);
    expect(issues?.has("derived3")).toBe(true);

    // Create the missing token
    const result = resolver.createToken({
      tokenPath: "base",
      tokenData: { $value: "10", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("10");
    expect(getAffectedTokens(result).has("base")).toBe(true);
    // Note: We don't track that derived tokens were fixed
  });

  it("should handle mathematical expressions", () => {
    const allTokens = new Map<string, TokenData>([["base", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "calculated",
      tokenData: { $value: "{base} * 2 + 5", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("25");
  });

  it("should handle string values", () => {
    const allTokens = new Map<string, TokenData>([["text", { $value: "hello", $type: "string" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "greeting",
      tokenData: { $value: "world", $type: "string" },
    });

    expect(result.resolved?.toString()).toBe("world");
  });

  it("should handle boolean values", () => {
    const allTokens = new Map<string, TokenData>([["flag1", { $value: "true", $type: "boolean" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "flag2",
      tokenData: { $value: "false", $type: "boolean" },
    });

    expect(result.resolved?.toString()).toBe("false");
  });

  it("should return dependants graph with dependency relationships", () => {
    const allTokens = new Map<string, TokenData>([["base", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * 2", $type: "dimension" },
    });

    expect(result.dependants?.graph).toBeDefined();
    const nodes = result.dependants!.graph.getNodes();
    expect(nodes.has("derived")).toBe(true);
  });

  it("should handle token with no type specified", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "test" }]]);

    const { resolver } = new TokenResolver().build(allTokens);
    const result = resolver.createToken({
      tokenPath: "newToken",
      tokenData: { $value: "newValue" },
    });

    expect(result.resolved?.toString()).toBe("newValue");
    expect(result.created).toBe(true);
  });

  it("should throw error when called before build()", () => {
    const resolver = new TokenResolver();

    expect(() => {
      resolver.createToken({
        tokenPath: "token",
        tokenData: { $value: "value" },
      });
    }).toThrow("PROC_RESOLVER_NOT_INITIALIZED");
  });

  it("should persist created token for subsequent operations", () => {
    const allTokens = new Map<string, TokenData>([["base", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Create a new token
    resolver.createToken({
      tokenPath: "multiplier",
      tokenData: { $value: "2", $type: "dimension" },
    });

    // Create another token that depends on the first created token
    const result = resolver.createToken({
      tokenPath: "calculated",
      tokenData: { $value: "{base} * {multiplier}", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("20");
  });

  it("should work with updateToken after create", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "5", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Create a new token
    resolver.createToken({
      tokenPath: "newToken",
      tokenData: { $value: "{existing} * 2", $type: "dimension" },
    });

    // Update the created token
    const result = resolver.updateToken({
      tokenPath: "newToken",
      tokenData: { $value: "{existing} * 3", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("15");
    expect(result.updated).toBe(true);
  });

  it("should create token in a system with transitive broken dependencies", () => {
    const allTokens = new Map<string, TokenData>([
      ["level2", { $value: "{level1} + 1", $type: "dimension" }],
      ["level3", { $value: "{level2} + 1", $type: "dimension" }],
    ]);

    // Build with broken references
    const { resolver, issues } = new TokenResolver().build(allTokens);
    expect(issues?.has("level2")).toBe(true);
    expect(issues?.has("level3")).toBe(true);

    // Create the base token
    const result = resolver.createToken({
      tokenPath: "level1",
      tokenData: { $value: "10", $type: "dimension" },
    });

    expect(result.resolved?.toString()).toBe("10");
    expect(getAffectedTokens(result).has("level1")).toBe(true);
    // Note: We don't track that level2 and level3 were fixed
  });

  it("should detect circular dependency when creating token that causes cycle", () => {
    const allTokens = new Map<string, TokenData>([["a", { $value: "{b} + 1", $type: "dimension" }]]);

    // Build with broken reference
    const { resolver } = new TokenResolver().build(allTokens);

    // Create token b that references a, creating a cycle
    // Should return issues for circular dependency instead of throwing
    const result = resolver.createToken({
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

  it("should handle self-referencing token", () => {
    const allTokens = new Map<string, TokenData>([["existing", { $value: "10", $type: "dimension" }]]);

    const { resolver } = new TokenResolver().build(allTokens);

    // Creating a self-referencing token should return circular dependency issue
    const result = resolver.createToken({
      tokenPath: "selfRef",
      tokenData: { $value: "{selfRef}", $type: "dimension" },
    });

    // Should have issues for the circular dependency
    expect(result.issues).toBeDefined();
    expect(result.issues?.has("selfRef")).toBe(true);

    // Check that the issue is specifically a circular dependency error
    const selfRefIssues = result.issues?.get("selfRef");
    expect(selfRefIssues).toBeDefined();
    const circularError = selfRefIssues?.find((issue) => "code" in issue && issue.code === ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    expect(circularError).toBeDefined();
  });
});
