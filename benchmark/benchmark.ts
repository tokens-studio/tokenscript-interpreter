import { interpretTokens } from "../lib";
import { TokenSetResolver } from "../tokenset-processor";
import { PerformanceTracker } from "../utils/performance-tracker";

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  name?: string;
  verbose?: boolean;
}

export interface BenchmarkResult {
  name: string;
  averageTime: number; // in milliseconds
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
  tokensPerSecond: number;
  tokenCount: number;
}

/**
 * Run a benchmark test for token resolution
 *
 * @param tokens The token dataset to benchmark
 * @param options Benchmark configuration options
 * @returns Benchmark results
 */
export function benchmarkTokenResolution(
  tokens: Record<string, any>,
  options: BenchmarkOptions = {},
): BenchmarkResult {
  const {
    iterations = 10,
    warmupIterations = 2,
    name = "Token Resolution",
    verbose = false,
  } = options;

  const tokenCount = Object.keys(tokens).length;

  if (verbose) {
    console.log(`🔄 Running benchmark: ${name}`);
    console.log(`📊 Dataset size: ${tokenCount} tokens`);
    console.log(`🔥 Warmup iterations: ${warmupIterations}`);
    console.log(`🔁 Benchmark iterations: ${iterations}`);
  }

  // Warmup phase
  if (verbose) console.log("🔥 Warming up...");
  for (let i = 0; i < warmupIterations; i++) {
    interpretTokens(tokens);
  }

  // Benchmark phase
  const times: number[] = [];

  if (verbose) console.log("🔄 Running benchmark...");
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    interpretTokens(tokens);
    const end = performance.now();
    times.push(end - start);

    if (verbose && (i === 0 || i === iterations - 1 || i % 5 === 0)) {
      console.log(
        `  ▶️ Iteration ${i + 1}/${iterations}: ${times[i].toFixed(2)}ms`,
      );
    }
  }

  // Calculate results
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const tokensPerSecond = Math.round(
    (tokenCount * iterations) / (totalTime / 1000),
  );

  const result: BenchmarkResult = {
    name,
    averageTime,
    minTime,
    maxTime,
    totalTime,
    iterations,
    tokensPerSecond,
    tokenCount,
  };

  if (verbose) {
    console.log("✅ Benchmark complete!");
    console.log(`📊 Results for ${name}:`);
    console.log(`  • Average time: ${averageTime.toFixed(2)}ms`);
    console.log(`  • Min time: ${minTime.toFixed(2)}ms`);
    console.log(`  • Max time: ${maxTime.toFixed(2)}ms`);
    console.log(`  • Total time: ${totalTime.toFixed(2)}ms`);
    console.log(
      `  • Throughput: ${tokensPerSecond.toLocaleString()} tokens/second`,
    );
  }

  return result;
}

/**
 * Compare the performance of different implementations or configurations
 *
 * @param benchmarks Array of benchmark functions to run and compare
 * @returns Array of benchmark results
 */
export function compareBenchmarks(
  benchmarks: Array<() => BenchmarkResult>,
): BenchmarkResult[] {
  const results = benchmarks.map((benchmark) => benchmark());

  console.log("\n📊 Benchmark Comparison:");
  console.log("=".repeat(80));
  console.log(
    "Benchmark".padEnd(30) +
      "Avg Time".padStart(12) +
      "Min Time".padStart(12) +
      "Tokens/sec".padStart(15) +
      "Iterations".padStart(12),
  );
  console.log("-".repeat(80));

  results.forEach((result) => {
    console.log(
      result.name.padEnd(30) +
        `${result.averageTime.toFixed(2)}ms`.padStart(12) +
        `${result.minTime.toFixed(2)}ms`.padStart(12) +
        `${result.tokensPerSecond.toLocaleString()}`.padStart(15) +
        `${result.iterations}`.padStart(12),
    );
  });
  console.log("=".repeat(80));

  // Find the fastest implementation
  const fastest = results.reduce((prev, current) =>
    prev.tokensPerSecond > current.tokensPerSecond ? prev : current,
  );

  console.log(
    `🏆 Fastest: ${fastest.name} (${fastest.tokensPerSecond.toLocaleString()} tokens/second)`,
  );

  return results;
}

/**
 * Benchmark the raw TokenSetResolver performance
 *
 * @param tokens The token dataset to benchmark
 * @param options Benchmark configuration options
 * @returns Benchmark results
 */
export function benchmarkRawResolver(
  tokens: Record<string, string>,
  options: BenchmarkOptions = {},
): BenchmarkResult {
  const {
    iterations = 10,
    warmupIterations = 2,
    name = "Raw TokenSetResolver",
    verbose = false,
  } = options;

  const tokenCount = Object.keys(tokens).length;

  if (verbose) {
    console.log(`🔄 Running benchmark: ${name}`);
    console.log(`📊 Dataset size: ${tokenCount} tokens`);
  }

  // Warmup phase
  if (verbose) console.log("🔥 Warming up...");
  for (let i = 0; i < warmupIterations; i++) {
    const resolver = new TokenSetResolver({ ...tokens });
    resolver.resolve();
  }

  // Benchmark phase
  const times: number[] = [];

  if (verbose) console.log("🔄 Running benchmark...");
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const resolver = new TokenSetResolver({ ...tokens });
    resolver.resolve();
    const end = performance.now();
    times.push(end - start);

    if (verbose && (i === 0 || i === iterations - 1 || i % 5 === 0)) {
      console.log(
        `  ▶️ Iteration ${i + 1}/${iterations}: ${times[i].toFixed(2)}ms`,
      );
    }
  }

  // Calculate results
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const tokensPerSecond = Math.round(
    (tokenCount * iterations) / (totalTime / 1000),
  );

  return {
    name,
    averageTime,
    minTime,
    maxTime,
    totalTime,
    iterations,
    tokensPerSecond,
    tokenCount,
  };
}
