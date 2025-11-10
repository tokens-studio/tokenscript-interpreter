import { performance } from "node:perf_hooks";
import { TokenProcessor, type TokenProcessorMode } from "@src/processor";

type BenchmarkArgs = {
  groups: number;
  itemsPerGroup: number;
  iterations: number;
};

type BenchmarkResult = {
  mode: TokenProcessorMode;
  averageMs: number;
  totalMs: number;
  resolved: number;
};

type TokenMap = Map<string, string>;

function parseArgs(): BenchmarkArgs {
  const defaults: BenchmarkArgs = { groups: 25, itemsPerGroup: 20, iterations: 5 };
  const args = process.argv.slice(2);
  const parsed: Partial<BenchmarkArgs> = {};

  for (const arg of args) {
    const [key, rawValue] = arg.split("=");
    if (!rawValue) continue;
    const value = Number(rawValue);
    if (Number.isNaN(value)) continue;
    if (key === "--groups") parsed.groups = value;
    if (key === "--items") parsed.itemsPerGroup = value;
    if (key === "--iterations") parsed.iterations = value;
  }

  return {
    groups: parsed.groups ?? defaults.groups,
    itemsPerGroup: parsed.itemsPerGroup ?? defaults.itemsPerGroup,
    iterations: parsed.iterations ?? defaults.iterations,
  };
}

function buildTokens(groups: number, itemsPerGroup: number): TokenMap {
  const tokens: TokenMap = new Map();

  for (let i = 0; i < itemsPerGroup; i++) {
    tokens.set(`base.${i}`, `${i + 1}`);
  }

  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < itemsPerGroup; i++) {
      const baseRef = `base.${i % itemsPerGroup}`;
      tokens.set(`group${g}.item${i}`, `{${baseRef}} * ${g + 1}`);
    }

    tokens.set(`theme${g}.palette`, `{group${g}}`);
    tokens.set(`theme${g}.primary`, `{theme${g}.palette.item0}`);
  }

  return tokens;
}

function benchmark(
  mode: TokenProcessorMode,
  tokens: TokenMap,
  iterations: number,
): BenchmarkResult {
  const processor = new TokenProcessor(mode);
  let resolved = 0;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const result = processor.processTokens(tokens, undefined, undefined, { mode });
    resolved = result.resolved.size;
  }

  const totalMs = performance.now() - start;
  return {
    mode,
    totalMs,
    averageMs: totalMs / iterations,
    resolved,
  };
}

function formatRow(result: BenchmarkResult): string {
  return [
    result.mode.toUpperCase().padEnd(10),
    `${result.averageMs.toFixed(2)} ms`.padEnd(15),
    `${result.totalMs.toFixed(2)} ms`.padEnd(15),
    `${result.resolved}`,
  ].join(" | ");
}

function run(): void {
  const args = parseArgs();
  console.log("[benchmark] configuration", args);
  const tokens = buildTokens(args.groups, args.itemsPerGroup);
  console.log(`[benchmark] generated ${tokens.size} tokens`);

  const prefix = benchmark("prefix", tokens, args.iterations);
  const legacy = benchmark("legacy", tokens, args.iterations);

  console.log("\nMode       | Avg Time       | Total Time     | Resolved");
  console.log("--------------------------------------------------------");
  console.log(formatRow(prefix));
  console.log(formatRow(legacy));

  const speedRatio = legacy.averageMs / prefix.averageMs;
  console.log(`\n[benchmark] prefix is ${speedRatio.toFixed(2)}x faster (average)`);
}

run();
