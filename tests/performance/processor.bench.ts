import { TokenResolver } from "@src/processor";
import { bench, describe } from "vitest";

/**
 * TokenResolver Performance Benchmarks
 *
 * This benchmark suite tests the performance characteristics of the TokenResolver
 * implementation across various workload patterns:
 *
 * - Phase-based resolution with prefix optimization
 * - Event-driven cascade resolution
 * - Specialized handling for virtual children
 * - Five-phase resolution strategy
 *
 * The processor is optimized for prefix-based token hierarchies while maintaining
 * good performance for flat token structures.
 */

describe("TokenResolver Performance Benchmarks", () => {
  describe("Simple tokens (no dependencies)", () => {
    const tokens = new Map([
      ["color.red", "#FF0000"],
      ["color.green", "#00FF00"],
      ["color.blue", "#0000FF"],
      ["spacing.xs", "4"],
      ["spacing.sm", "8"],
      ["spacing.md", "16"],
      ["spacing.lg", "24"],
      ["spacing.xl", "32"],
    ]);

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Simple references", () => {
    const tokens = new Map([
      ["base.unit", "8"],
      ["spacing.xs", "{base.unit}"],
      ["spacing.sm", "{base.unit} * 2"],
      ["spacing.md", "{base.unit} * 3"],
      ["spacing.lg", "{base.unit} * 4"],
      ["spacing.xl", "{base.unit} * 5"],
    ]);

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Chained dependencies", () => {
    const tokens = new Map<string, string>();
    tokens.set("base", "10");
    for (let i = 1; i <= 50; i++) {
      tokens.set(`chain.${i}`, `{${i === 1 ? "base" : `chain.${i - 1}`}} + 1`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Flat token structure (100 tokens)", () => {
    const tokens = new Map<string, string>();
    for (let i = 0; i < 100; i++) {
      tokens.set(`token.${i}`, `${i}`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Wide dependency tree", () => {
    const tokens = new Map<string, string>();
    tokens.set("base.unit", "8");
    tokens.set("base.scale", "1.5");

    // Create 50 tokens that all depend on the same base tokens
    for (let i = 0; i < 50; i++) {
      tokens.set(`spacing.${i}`, `{base.unit} * {base.scale} * ${i}`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Deep dependency chain", () => {
    const tokens = new Map<string, string>();
    tokens.set("level.0", "10");
    for (let i = 1; i <= 20; i++) {
      tokens.set(`level.${i}`, `{level.${i - 1}} * 1.2`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Prefix-based hierarchy", () => {
    const tokens = new Map([
      ["colors.brand.primary", "#FF0000"],
      ["colors.brand.secondary", "#00FF00"],
      ["colors.brand.accent", "#0000FF"],
      ["colors.neutral.50", "#FAFAFA"],
      ["colors.neutral.100", "#F5F5F5"],
      ["colors.neutral.200", "#E5E5E5"],
      ["theme.palette", "{colors.brand}"],
      ["theme.bg", "{theme.palette.primary}"],
      ["theme.text", "{colors.neutral.100}"],
    ]);

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Complex prefix with virtual children", () => {
    const tokens = new Map<string, string>();

    // Create a large prefix hierarchy
    for (let i = 0; i < 20; i++) {
      tokens.set(`colors.palette.${i}.main`, `#${(i * 10).toString(16).padStart(6, "0")}`);
      tokens.set(`colors.palette.${i}.light`, `#${(i * 10 + 5).toString(16).padStart(6, "0")}`);
      tokens.set(`colors.palette.${i}.dark`, `#${(i * 10 + 3).toString(16).padStart(6, "0")}`);
    }

    // Reference the prefix subtree
    tokens.set("theme.colors", "{colors.palette}");

    // Reference virtual children
    for (let i = 0; i < 20; i++) {
      tokens.set(`component.bg.${i}`, `{theme.colors.${i}.main}`);
      tokens.set(`component.border.${i}`, `{theme.colors.${i}.dark}`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Large mixed workload (300 tokens)", () => {
    const tokens = new Map<string, string>();

    // Base tokens (50)
    for (let i = 0; i < 50; i++) {
      tokens.set(`base.size.${i}`, `${i + 8}`);
    }

    // Derived tokens with simple references (50)
    for (let i = 0; i < 50; i++) {
      tokens.set(`spacing.${i}`, `{base.size.${i}} * 2`);
    }

    // Nested dependencies (50)
    for (let i = 0; i < 50; i++) {
      tokens.set(`component.padding.${i}`, `{spacing.${i}} + 4`);
    }

    // Complex expressions (50)
    for (let i = 0; i < 25; i++) {
      tokens.set(`calc.${i}`, `({base.size.${i}} + {base.size.${i + 1}}) * 2`);
    }

    // Prefix hierarchy (50)
    for (let i = 0; i < 10; i++) {
      tokens.set(`colors.set${i}.primary`, `#${(i * 20).toString(16).padStart(6, "0")}`);
      tokens.set(`colors.set${i}.secondary`, `#${(i * 20 + 10).toString(16).padStart(6, "0")}`);
      tokens.set(`colors.set${i}.accent`, `#${(i * 20 + 15).toString(16).padStart(6, "0")}`);
    }

    // Prefix references (30)
    for (let i = 0; i < 10; i++) {
      tokens.set(`theme.colorSet${i}`, `{colors.set${i}}`);
      tokens.set(`ui.bg.${i}`, `{theme.colorSet${i}.primary}`);
      tokens.set(`ui.border.${i}`, `{theme.colorSet${i}.accent}`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Extreme case: 1000 flat tokens", () => {
    const tokens = new Map<string, string>();
    for (let i = 0; i < 1000; i++) {
      tokens.set(`token.${i}`, `${i * 2}`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Extreme case: 500 tokens with dependencies", () => {
    const tokens = new Map<string, string>();
    tokens.set("base", "10");

    // Create multiple dependency chains
    for (let chain = 0; chain < 10; chain++) {
      tokens.set(`chain${chain}.0`, "{base}");
      for (let i = 1; i < 50; i++) {
        tokens.set(`chain${chain}.${i}`, `{chain${chain}.${i - 1}} + 1`);
      }
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });

  describe("Real-world design system (200 tokens)", () => {
    const tokens = new Map<string, string>();

    // Base scale
    tokens.set("scale.base", "8");
    tokens.set("scale.ratio", "1.5");

    // Typography
    for (let i = 0; i < 10; i++) {
      tokens.set(`typography.size.${i}`, `{scale.base} * ${1 + i * 0.25}`);
      tokens.set(`typography.lineHeight.${i}`, `{typography.size.${i}} * 1.5`);
      tokens.set(`typography.letterSpacing.${i}`, `{typography.size.${i}} * 0.05`);
    }

    // Colors
    for (let i = 0; i < 10; i++) {
      tokens.set(`colors.brand.${i}`, `#${(i * 15).toString(16).padStart(6, "0")}`);
      tokens.set(`colors.neutral.${i}`, `#${(i * 25).toString(16).padStart(6, "0")}`);
      tokens.set(`colors.semantic.${i}`, `#${(i * 35).toString(16).padStart(6, "0")}`);
    }

    // Spacing
    for (let i = 0; i < 20; i++) {
      tokens.set(`spacing.${i}`, `{scale.base} * ${1.5 ** (i / 4)}`);
    }

    // Components
    for (let i = 0; i < 10; i++) {
      tokens.set(`button.padding.${i}`, `{spacing.${i}}`);
      tokens.set(`button.fontSize.${i}`, `{typography.size.${i}}`);
      tokens.set(`button.bg.${i}`, `{colors.brand.${i}}`);
    }

    // Theme composition
    tokens.set("theme.colors", "{colors.brand}");
    tokens.set("theme.spacing", "{spacing}");
    tokens.set("theme.typography", "{typography.size}");

    // Component themes
    for (let i = 0; i < 5; i++) {
      tokens.set(`componentTheme.button.${i}.bg`, `{theme.colors.${i}}`);
      tokens.set(`componentTheme.button.${i}.padding`, `{theme.spacing.${i}}`);
      tokens.set(`componentTheme.button.${i}.fontSize`, `{theme.typography.${i}}`);
    }

    bench("Process tokens", () => {
      const processor = new TokenResolver();
      processor.processTokens(tokens);
    });
  });
});
