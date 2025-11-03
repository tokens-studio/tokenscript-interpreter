import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { JsonTokensAdapter, TokenProcessor } from "@src/processor";
import { TokenSetResolver } from "@src/tokenset-processor";

describe("Performance Comparison: Old vs New Implementation", () => {
  const tokensPath = resolve(__dirname, "../../data/examples/tokens.json");
  const tokensJsonRaw = JSON.parse(readFileSync(tokensPath, "utf-8"));
  // Extract just the "core" token set for testing (since $themes is empty)
  const tokensJson = tokensJsonRaw.core;

  // Helper to flatten nested tokens for old implementation
  function flattenTokens(obj: Record<string, any>, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$")) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if ("$value" in value) {
          result[path] = String(value.$value);
        } else {
          Object.assign(result, flattenTokens(value, path));
        }
      }
    }
    return result;
  }

  // Helper to extract value from Symbol objects
  const getValue = (v: any) => (v && typeof v === "object" && "value" in v ? v.value : v);

  // Helper to stringify Symbol objects for comparison
  const stringifyValue = (v: any): string => {
    if (v && typeof v === "object" && "value" in v) {
      return String(v.value);
    }
    return String(v);
  };

  it("should produce identical results", () => {
    // Old implementation
    const flatTokens = flattenTokens(tokensJson);
    const oldResolver = new TokenSetResolver(flatTokens, {});
    const oldResult = oldResolver.resolve();

    // New implementation
    const newProcessor = new TokenProcessor();
    const adapter = JsonTokensAdapter();
    const newResult = newProcessor.build(tokensJson, adapter);

    // Convert new result to comparable format
    const newResultObj: Record<string, any> = {};
    for (const [key, value] of newResult.tokens) {
      newResultObj[key] = getValue(value);
    }

    // Compare number of tokens
    const oldTokenCount = Object.keys(oldResult.resolvedTokens).length;
    const newTokenCount = Object.keys(newResultObj).length;

    console.log(`\n📊 Token counts:`);
    console.log(`  Old: ${oldTokenCount}`);
    console.log(`  New: ${newTokenCount}`);

    expect(newTokenCount).toBe(oldTokenCount);

    // Compare each token value
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches: string[] = [];

    for (const [key, oldValue] of Object.entries(oldResult.resolvedTokens)) {
      const newValue = newResultObj[key];
      const oldStr = stringifyValue(oldValue);
      const newStr = stringifyValue(newValue);

      if (oldStr === newStr) {
        matchCount++;
      } else {
        mismatchCount++;
        mismatches.push(
          `  ${key}:\n    Old: ${oldStr}\n    New: ${newStr}`,
        );
      }
    }

    console.log(`\n✅ Matches: ${matchCount}`);
    console.log(`❌ Mismatches: ${mismatchCount}`);

    if (mismatches.length > 0 && mismatches.length <= 10) {
      console.log(`\n🔍 Mismatches:\n${mismatches.join("\n")}`);
    }

    expect(mismatchCount).toBe(0);
  });

  it("should compare performance", () => {
    const iterations = 10;

    // Warm up
    for (let i = 0; i < 2; i++) {
      const flatTokens = flattenTokens(tokensJson);
      new TokenSetResolver(flatTokens, {}).resolve();
      const adapter = JsonTokensAdapter();
      new TokenProcessor().build(tokensJson, adapter);
    }

    // Old implementation benchmark
    const oldTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const flatTokens = flattenTokens(tokensJson);
      const start = performance.now();
      const resolver = new TokenSetResolver(flatTokens, {});
      resolver.resolve();
      const end = performance.now();
      oldTimes.push(end - start);
    }

    // New implementation benchmark (with adapters)
    const newTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const adapter = JsonTokensAdapter();
      const processor = new TokenProcessor();
      const start = performance.now();
      processor.build(tokensJson, adapter);
      const end = performance.now();
      newTimes.push(end - start);
    }

    const oldAvg = oldTimes.reduce((a, b) => a + b, 0) / oldTimes.length;
    const newAvg = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
    const oldMin = Math.min(...oldTimes);
    const oldMax = Math.max(...oldTimes);
    const newMin = Math.min(...newTimes);
    const newMax = Math.max(...newTimes);

    const speedup = oldAvg / newAvg;
    const percentChange = ((newAvg - oldAvg) / oldAvg) * 100;

    console.log(`\n⏱️  Performance Results (${iterations} iterations):`);
    console.log(`\n  Old Implementation:`);
    console.log(`    Average: ${oldAvg.toFixed(2)}ms`);
    console.log(`    Min: ${oldMin.toFixed(2)}ms`);
    console.log(`    Max: ${oldMax.toFixed(2)}ms`);
    console.log(`\n  New Implementation (optimized):`);
    console.log(`    Average: ${newAvg.toFixed(2)}ms`);
    console.log(`    Min: ${newMin.toFixed(2)}ms`);
    console.log(`    Max: ${newMax.toFixed(2)}ms`);
    console.log(`    Speedup: ${speedup.toFixed(2)}x`);
    console.log(`    Change: ${percentChange > 0 ? "+" : ""}${percentChange.toFixed(1)}%`);

    console.log(`\n  Result:`);
    if (speedup > 1) {
      console.log(`    ✅ New implementation is ${speedup.toFixed(2)}x faster!`);
    } else if (speedup < 1) {
      console.log(
        `    ⚠️  New implementation is ${(1 / speedup).toFixed(2)}x slower`,
      );
    } else {
      console.log(`    ➡️  Performance is comparable`);
    }

    // Don't fail test based on performance, just report
    expect(newAvg).toBeGreaterThan(0);
  });

  it("should handle errors consistently", () => {
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

    // Old implementation
    const flatTokens = flattenTokens(tokensWithErrors);
    const oldResolver = new TokenSetResolver(flatTokens, {});
    const oldResult = oldResolver.resolve();

    // New implementation
    const newProcessor = new TokenProcessor();
    const adapter = JsonTokensAdapter();
    const newResult = newProcessor.build(tokensWithErrors, adapter);

    console.log(`\n🔍 Error Handling Comparison:`);
    console.log(`  Old warnings: ${oldResult.warnings.length}`);
    console.log(`  New errors: ${newResult.errors.size}`);

    // Both should handle the valid token correctly
    expect(getValue(newResult.tokens.get("valid"))).toBe(10);
    expect(stringifyValue(oldResult.resolvedTokens.valid)).toBe("10");

    // Compare error handling approach:
    // - New implementation preserves original value for errored tokens
    // - Old implementation stores undefined for errored tokens
    console.log(`  Old invalid token: ${oldResult.resolvedTokens.invalid}`);
    console.log(`  New invalid token: ${newResult.tokens.get("invalid")}`);
    
    // New implementation preserves original value (better UX)
    expect(newResult.tokens.get("invalid")).toBe("{nonexistent} + 5");
    
    // Old implementation behavior (undefined for errors)
    expect(oldResult.resolvedTokens.invalid).toBeUndefined();
  });
});
