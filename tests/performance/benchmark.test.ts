import { processTokens } from "@src/processor/process";
import { describe, expect, it } from "vitest";

describe("Performance Benchmark", () => {
  it("should efficiently resolve large token sets", () => {
    // Create a large token set with dependencies
    const tokens: Record<string, string> = {};

    // Base tokens
    for (let i = 0; i < 50; i++) {
      tokens[`base.size.${i}`] = `${i + 8}`;
      tokens[`base.color.${i}`] = `#${(i * 4).toString(16).padStart(6, "0")}`;
    }

    // Derived tokens that reference base tokens
    for (let i = 0; i < 50; i++) {
      tokens[`component.padding.${i}`] = `{base.size.${i}} * 2`;
      tokens[`component.margin.${i}`] = `{component.padding.${i}} + 4`;
      tokens[`layout.spacing.${i}`] = `{component.margin.${i}} / 2`;
    }

    // Complex expressions
    for (let i = 0; i < 25; i++) {
      tokens[`complex.calc.${i}`] = `({base.size.${i}} + {base.size.${i + 1}}) * {base.size.${i + 2}}`;
    }

    const startTime = performance.now();
    const output = processTokens(tokens);
    const endTime = performance.now();

    const duration = endTime - startTime;
    const tokensPerSecond = Math.round(Object.keys(tokens).length / (duration / 1000));

    // Verify some results
    expect(output.tokens.get("base.size.0")?.toString()).toBe("8");
    expect(output.tokens.get("component.padding.0")?.toString()).toBe("16");
    expect(output.tokens.get("component.margin.0")?.toString()).toBe("20");
    expect(output.tokens.get("layout.spacing.0")?.toString()).toBe("10");

    // Verify complex calculations
    expect(output.tokens.get("complex.calc.0")?.toString()).toBe("170"); // (8 + 9) * 10 = 170

    // Should be reasonably fast (this is a rough benchmark)
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(tokensPerSecond).toBeGreaterThan(100); // Should process at least 100 tokens/second
  });

  it("should demonstrate AST caching efficiency", () => {
    // Create tokens that would benefit from AST caching
    const tokens = {
      "base.unit": "8",
      "scale.small": "0.75",
      "scale.medium": "1",
      "scale.large": "1.25",
      "scale.xlarge": "1.5",

      // These all use similar expressions but with different references
      "spacing.xs": "{base.unit} * {scale.small}",
      "spacing.sm": "{base.unit} * {scale.medium}",
      "spacing.md": "{base.unit} * {scale.large}",
      "spacing.lg": "{base.unit} * {scale.xlarge}",

      // Nested dependencies
      "component.padding.xs": "{spacing.xs} + 2",
      "component.padding.sm": "{spacing.sm} + 2",
      "component.padding.md": "{spacing.md} + 2",
      "component.padding.lg": "{spacing.lg} + 2",

      // Complex nested expressions
      "layout.gap.xs": "({component.padding.xs} + {spacing.xs}) / 2",
      "layout.gap.sm": "({component.padding.sm} + {spacing.sm}) / 2",
      "layout.gap.md": "({component.padding.md} + {spacing.md}) / 2",
      "layout.gap.lg": "({component.padding.lg} + {spacing.lg}) / 2",
    };

    const startTime = performance.now();
    const output = processTokens(tokens);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Verify results
    expect(output.tokens.get("spacing.xs")?.toString()).toBe("6"); // 8 * 0.75 = 6
    expect(output.tokens.get("spacing.sm")?.toString()).toBe("8"); // 8 * 1 = 8
    expect(output.tokens.get("component.padding.xs")?.toString()).toBe("8"); // 6 + 2 = 8
    expect(output.tokens.get("layout.gap.xs")?.toString()).toBe("7"); // (8 + 6) / 2 = 7

    // Should be very fast due to AST caching
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it("should demonstrate interpreter reuse efficiency", () => {
    // Create a scenario that would have been very slow with the old approach
    // (creating new Interpreter instances for each token)
    const tokens: Record<string, string> = {};

    // Create a chain of dependencies where each token depends on the previous one
    tokens.base = "10";
    for (let i = 1; i <= 100; i++) {
      tokens[`chain.${i}`] = `{${i === 1 ? "base" : `chain.${i - 1}`}} + 1`;
    }

    const startTime = performance.now();
    const output = processTokens(tokens);
    const endTime = performance.now();

    const duration = endTime - startTime;
    const tokensPerSecond = Math.round(Object.keys(tokens).length / (duration / 1000));

    // Verify the chain resolved correctly
    expect(output.tokens.get("base")?.toString()).toBe("10");
    expect(output.tokens.get("chain.1")?.toString()).toBe("11");
    expect(output.tokens.get("chain.50")?.toString()).toBe("60");
    expect(output.tokens.get("chain.100")?.toString()).toBe("110");

    // Should be very fast due to interpreter reuse
    expect(duration).toBeLessThan(50); // Should complete in under 50ms
    expect(tokensPerSecond).toBeGreaterThan(2000); // Should process at least 2000 tokens/second
  });
});
