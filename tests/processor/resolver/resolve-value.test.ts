import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("TokenResolver.resolveValue", () => {
  const baseTokens = new Map<string, TokenData>([
    ["color.primary", { $value: "#FF0000", $type: "color" }],
    ["color.secondary", { $value: "#00FF00", $type: "color" }],
    ["spacing.base", { $value: "8", $type: "dimension" }],
    ["spacing.large", { $value: "{spacing.base} * 2", $type: "dimension" }],
    ["text", { $value: "hello" }],
  ]);

  it("should resolve a literal number expression", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "16 * 2" });

    expect(result.resolved?.toString()).toBe("32");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a reference to an existing token", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{spacing.base}" });

    expect(result.resolved?.toString()).toBe("8");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a reference expression with arithmetic", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{spacing.base} * 3 + 1" });

    expect(result.resolved?.toString()).toBe("25");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a color literal", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "#0000FF" });

    expect(result.resolved?.toString()).toBe("#0000FF");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a reference to a color token", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{color.primary}" });

    expect(result.resolved?.toString()).toBe("#FF0000");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a transitive reference", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    // spacing.large = {spacing.base} * 2 = 16
    const result = resolver.resolveValue({ value: "{spacing.large}" });

    expect(result.resolved?.toString()).toBe("16");
    expect(result.issues).toHaveLength(0);
  });

  it("should return null with no issues for empty string", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "" });

    expect(result.resolved).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("should return null with no issues for null", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: null });

    expect(result.resolved).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("should return null with no issues for undefined", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: undefined });

    expect(result.resolved).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("should return issue for missing reference", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{nonexistent}" });

    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("should return issue for syntax errors", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "1 + + +" });

    expect(result.resolved).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("should coerce non-string values to string", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: 42 });

    expect(result.resolved?.toString()).toBe("42");
    expect(result.issues).toHaveLength(0);
  });

  it("should throw when called before build()", () => {
    const resolver = new TokenResolver();

    expect(() => {
      resolver.resolveValue({ value: "10" });
    }).toThrow("PROC_RESOLVER_NOT_INITIALIZED");
  });

  it("should not mutate resolver state", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    // Resolve a preview value
    resolver.resolveValue({ value: "999" });

    // Existing token should still resolve correctly
    const result = resolver.updateToken({
      tokenPath: "spacing.base",
      tokenData: { $value: "8", $type: "dimension" },
    });
    expect(result.resolved?.toString()).toBe("8");
  });

  it("should reflect state after updateToken", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    // Update spacing.base from 8 to 20
    resolver.updateToken({
      tokenPath: "spacing.base",
      tokenData: { $value: "20", $type: "dimension" },
    });

    // resolveValue should now see the updated cache
    const result = resolver.resolveValue({ value: "{spacing.base}" });
    expect(result.resolved?.toString()).toBe("20");
  });

  it("should reflect state after createToken", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    resolver.createToken({
      tokenPath: "spacing.small",
      tokenData: { $value: "4", $type: "dimension" },
    });

    const result = resolver.resolveValue({ value: "{spacing.small}" });
    expect(result.resolved?.toString()).toBe("4");
  });

  it("should reflect state after deleteToken", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    resolver.deleteToken({ tokenPath: "spacing.base" });

    // Reference to deleted token should produce an issue
    const result = resolver.resolveValue({ value: "{spacing.base}" });
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
