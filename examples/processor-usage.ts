/**
 * Examples of using the TokenProcessor with different adapters
 */

import { JsonTokensAdapter, ThemeTokensAdapter, TokenProcessor } from "../src/processor";

// Helper to extract value from Symbol objects
const getValue = (v: any) => (v && typeof v === "object" && "value" in v ? v.value : v);

console.log("🚀 TokenProcessor Examples\n");

// ============================================================================
// Example 1: Simple nested tokens
// ============================================================================
console.log("Example 1: Simple nested JSON tokens");
console.log("=====================================\n");

const processor = new TokenProcessor();
const simpleTokens = {
  spacing: {
    base: {
      $value: "8",
    },
    small: {
      $value: "{spacing.base} / 2",
    },
    large: {
      $value: "{spacing.base} * 2",
    },
  },
  colors: {
    primary: {
      $value: "#FF0000",
    },
    secondary: {
      $value: "{colors.primary}",
    },
  },
};

const result1 = processor.build(simpleTokens, JsonTokensAdapter());

console.log("Resolved tokens:");
for (const [name, value] of result1.tokens) {
  console.log(`  ${name}: ${getValue(value)}`);
}

console.log(`\n✅ Processed ${result1.tokens.size} tokens`);
console.log(`❌ Errors: ${result1.errors.size}\n`);

// ============================================================================
// Example 2: Flat tokens (no adapter needed)
// ============================================================================
console.log("Example 2: Flat tokens with direct Map");
console.log("========================================\n");

const flatTokens = new Map([
  ["a", "10"],
  ["b", "{a} * 2"],
  ["c", "{a} + {b}"],
]);

const result2 = processor.build(flatTokens);

console.log("Resolved tokens:");
for (const [name, value] of result2.tokens) {
  console.log(`  ${name}: ${getValue(value)}`);
}
console.log();

// ============================================================================
// Example 3: Theme-based tokens
// ============================================================================
console.log("Example 3: Theme-based tokens");
console.log("==============================\n");

const themedTokens = {
  $themes: [
    {
      name: "light",
      selectedTokenSets: {
        global: "enabled",
        light: "enabled",
      },
    },
    {
      name: "dark",
      selectedTokenSets: {
        global: "enabled",
        dark: "enabled",
      },
    },
  ],
  global: {
    spacing: {
      base: {
        $value: "8",
      },
    },
  },
  light: {
    colors: {
      background: {
        $value: "#FFFFFF",
      },
      text: {
        $value: "#000000",
      },
    },
  },
  dark: {
    colors: {
      background: {
        $value: "#000000",
      },
      text: {
        $value: "#FFFFFF",
      },
    },
  },
};

// Process light theme
const lightAdapter = ThemeTokensAdapter({ themeName: "light" });
const lightResult = processor.build(themedTokens, lightAdapter);

console.log("Light theme:");
for (const [name, value] of lightResult.tokens) {
  console.log(`  ${name}: ${getValue(value)}`);
}

// Process dark theme
const darkAdapter = ThemeTokensAdapter({ themeName: "dark" });
const darkResult = processor.build(themedTokens, darkAdapter);

console.log("\nDark theme:");
for (const [name, value] of darkResult.tokens) {
  console.log(`  ${name}: ${getValue(value)}`);
}
console.log();

// ============================================================================
// Example 4: Error handling
// ============================================================================
console.log("Example 4: Error handling");
console.log("=========================\n");

const tokensWithErrors = {
  valid: {
    $value: "10",
  },
  invalid: {
    $value: "{nonexistent} + 5",
  },
  dependent: {
    $value: "{invalid} * 2",
  },
};

const result4 = processor.build(tokensWithErrors, JsonTokensAdapter());

console.log("Resolved tokens:");
for (const [name, value] of result4.tokens) {
  const resolved = getValue(value);
  const hasError = result4.errors.has(name);
  const marker = hasError ? "❌" : "✅";
  console.log(`  ${marker} ${name}: ${resolved}`);
}

console.log("\nErrors:");
for (const [name, error] of result4.errors) {
  console.log(`  ${name}: ${error.message}`);
}
console.log();

// ============================================================================
// Example 5: Custom adapter
// ============================================================================
console.log("Example 5: Custom adapter");
console.log("==========================\n");

// Create a custom adapter that adds a prefix to all keys
const customAdapter = (input: Record<string, string>): Map<string, string> => {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(input)) {
    map.set(`custom.${key}`, value);
  }
  return map;
};

const customInput = {
  a: "100",
  b: "{custom.a} / 2",
};

const result5 = processor.build(customInput, customAdapter);

console.log("Resolved tokens with custom prefix:");
for (const [name, value] of result5.tokens) {
  console.log(`  ${name}: ${getValue(value)}`);
}
console.log();

console.log("✨ All examples completed!\n");
