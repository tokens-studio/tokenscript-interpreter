import type { BaseSymbol } from "@interpreter/symbols";
import { TokenResolver } from "@src/processor";
import { describe, expect, it } from "vitest";

function getValue(v: unknown): unknown {
  return v && typeof v === "object" && "value" in v ? (v as BaseSymbol).value : v;
}

describe("Ready Queue Optimization", () => {
  it("should resolve tokens via event-driven queue instead of repeated scanning", () => {
    const processor = new TokenResolver("prefix");

    // Create a chain of dependencies: a -> b -> c -> d -> e
    const tokens = new Map([
      ["a", "1"],
      ["b", "{a} + 1"],
      ["c", "{b} + 1"],
      ["d", "{c} + 1"],
      ["e", "{d} + 1"],
    ]);

    const result = processor.build(tokens);

    expect(getValue(result.tokens.get("a"))).toBe(1);
    expect(getValue(result.tokens.get("b"))).toBe(2);
    expect(getValue(result.tokens.get("c"))).toBe(3);
    expect(getValue(result.tokens.get("d"))).toBe(4);
    expect(getValue(result.tokens.get("e"))).toBe(5);
    expect(result.errors.size).toBe(0);
  });

  it("should handle complex dependency graph with multiple branches", () => {
    const processor = new TokenResolver("prefix");

    // Create a diamond dependency:
    //     a
    //    / \
    //   b   c
    //    \ /
    //     d
    const tokens = new Map([
      ["a", "10"],
      ["b", "{a} * 2"],
      ["c", "{a} * 3"],
      ["d", "{b} + {c}"],
    ]);

    const result = processor.build(tokens);

    expect(getValue(result.tokens.get("a"))).toBe(10);
    expect(getValue(result.tokens.get("b"))).toBe(20);
    expect(getValue(result.tokens.get("c"))).toBe(30);
    expect(getValue(result.tokens.get("d"))).toBe(50);
    expect(result.errors.size).toBe(0);
  });

  it("should efficiently resolve large chain of dependencies", () => {
    const processor = new TokenResolver("prefix");

    // Create a chain of 100 tokens
    const tokens = new Map<string, string>();
    tokens.set("token0", "1");

    for (let i = 1; i < 100; i++) {
      tokens.set(`token${i}`, `{token${i - 1}} + 1`);
    }

    const result = processor.build(tokens);

    // Verify the chain resolved correctly
    expect(getValue(result.tokens.get("token0"))).toBe(1);
    expect(getValue(result.tokens.get("token99"))).toBe(100);
    expect(result.errors.size).toBe(0);

    // Verify all tokens resolved
    for (let i = 0; i < 100; i++) {
      expect(result.tokens.has(`token${i}`)).toBe(true);
      expect(getValue(result.tokens.get(`token${i}`))).toBe(i + 1);
    }
  });

  it("should resolve prefix dependencies via ready queue", () => {
    const processor = new TokenResolver("prefix");

    const tokens = new Map([
      ["colors.red", "#ff0000"],
      ["colors.blue", "#0000ff"],
      ["primary", "{colors.red}"],
      ["secondary", "{colors.blue}"],
    ]);

    const result = processor.build(tokens);

    expect(getValue(result.tokens.get("colors.red"))).toBe("#ff0000");
    expect(getValue(result.tokens.get("colors.blue"))).toBe("#0000ff");
    expect(getValue(result.tokens.get("primary"))).toBe("#ff0000");
    expect(getValue(result.tokens.get("secondary"))).toBe("#0000ff");
    expect(result.errors.size).toBe(0);
  });

  it("should handle mixed prefix and token dependencies", () => {
    const processor = new TokenResolver("prefix");

    const tokens = new Map([
      ["base.size", "16"],
      ["base.scale", "1.5"],
      ["size.small", "{base.size}"],
      ["size.medium", "{base.size} * {base.scale}"],
      ["size.large", "{size.medium} * {base.scale}"],
    ]);

    const result = processor.build(tokens);

    expect(getValue(result.tokens.get("base.size"))).toBe(16);
    expect(getValue(result.tokens.get("base.scale"))).toBe(1.5);
    expect(getValue(result.tokens.get("size.small"))).toBe(16);
    expect(getValue(result.tokens.get("size.medium"))).toBe(24);
    expect(getValue(result.tokens.get("size.large"))).toBe(36);
    expect(result.errors.size).toBe(0);
  });
});
