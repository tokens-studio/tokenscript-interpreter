#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import {
  benchmarkRawResolver,
  benchmarkTokenResolution,
  compareBenchmarks,
} from "./benchmark";

const program = new Command();

program
  .name("token-benchmark")
  .description("Benchmark tool for token resolution performance")
  .version("1.0.0");

program
  .command("run")
  .description("Run benchmark on a token dataset")
  .requiredOption("--dataset <path>", "Path to JSON token dataset file")
  .option("--iterations <number>", "Number of benchmark iterations", "10")
  .option("--warmup <number>", "Number of warmup iterations", "2")
  .option("--name <string>", "Benchmark name", "Token Resolution")
  .option("--verbose", "Enable verbose output", false)
  .option("--output <path>", "Save results to JSON file")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("📊 Token Resolution Benchmark Tool"));
      console.log(chalk.cyan("=".repeat(50)));

      // Load dataset
      console.log(chalk.blue(`📂 Loading dataset from ${options.dataset}`));
      const datasetPath = path.resolve(options.dataset);
      const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

      const tokenCount = Object.keys(dataset).length;
      console.log(chalk.blue(`📊 Dataset contains ${tokenCount} tokens`));

      // Run benchmark
      const result = benchmarkTokenResolution(dataset, {
        iterations: parseInt(options.iterations),
        warmupIterations: parseInt(options.warmup),
        name: options.name,
        verbose: options.verbose,
      });

      // Display results
      console.log(chalk.green("\n✅ Benchmark Complete"));
      console.log(chalk.cyan("=".repeat(50)));
      console.log(chalk.white(`📊 Results for ${result.name}:`));
      console.log(chalk.white(`  • Dataset size: ${result.tokenCount} tokens`));
      console.log(chalk.white(`  • Iterations: ${result.iterations}`));
      console.log(
        chalk.white(`  • Average time: ${result.averageTime.toFixed(2)}ms`),
      );
      console.log(chalk.white(`  • Min time: ${result.minTime.toFixed(2)}ms`));
      console.log(chalk.white(`  • Max time: ${result.maxTime.toFixed(2)}ms`));
      console.log(
        chalk.white(`  • Total time: ${result.totalTime.toFixed(2)}ms`),
      );
      console.log(
        chalk.green(
          `  • Throughput: ${result.tokensPerSecond.toLocaleString()} tokens/second`,
        ),
      );
      console.log(chalk.cyan("=".repeat(50)));

      // Save results to file if output path is provided
      if (options.output) {
        const fs = require("fs");
        const path = require("path");
        const outputPath = path.resolve(options.output);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(chalk.green(`✅ Results saved to ${outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error running benchmark:"));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command("compare")
  .description("Compare performance between different dataset sizes")
  .requiredOption("--datasets <paths...>", "Paths to JSON token dataset files")
  .option("--iterations <number>", "Number of benchmark iterations", "5")
  .option("--warmup <number>", "Number of warmup iterations", "1")
  .option("--output <path>", "Save comparison results to JSON file")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("📊 Token Resolution Benchmark Comparison"));
      console.log(chalk.cyan("=".repeat(60)));

      const benchmarks = options.datasets.map((datasetPath: string) => {
        const dataset = JSON.parse(
          fs.readFileSync(path.resolve(datasetPath), "utf8"),
        );
        const name = path.basename(datasetPath, ".json");
        const tokenCount = Object.keys(dataset).length;

        console.log(chalk.blue(`📂 Loaded ${name} (${tokenCount} tokens)`));

        return () =>
          benchmarkTokenResolution(dataset, {
            iterations: parseInt(options.iterations),
            warmupIterations: parseInt(options.warmup),
            name: `${name} (${tokenCount} tokens)`,
            verbose: false,
          });
      });

      // Run comparison
      compareBenchmarks(benchmarks);
    } catch (error) {
      console.error(chalk.red("❌ Error running benchmark comparison:"));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command("generate")
  .description("Generate sample token datasets for benchmarking")
  .option("--sizes <sizes...>", "Sizes of datasets to generate", [
    "small",
    "medium",
    "large",
  ])
  .option("--output <dir>", "Output directory", "./benchmark-datasets")
  .option("--from <path>", "Path to JSON token dataset file to use as a base")
  .action(async (options) => {
    try {
      console.log(chalk.cyan("📊 Generating Sample Token Datasets"));
      console.log(chalk.cyan("=".repeat(50)));

      const sizeMap = {
        small: 50,
        medium: 500,
        large: 2000,
        xlarge: 10000,
      };

      // Create output directory if it doesn't exist
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      // If a source dataset is provided, use it as a base
      let sourceDataset: Record<string, any> | null = null;
      if (options.from) {
        try {
          console.log(
            chalk.blue(`Loading source dataset from ${options.from}...`),
          );
          const jsonContent = fs.readFileSync(options.from, "utf8");
          sourceDataset = JSON.parse(jsonContent);
          console.log(
            chalk.green(
              `✅ Loaded ${Object.keys(sourceDataset).length} tokens from source dataset`,
            ),
          );
        } catch (error) {
          console.error(
            chalk.red(`❌ Error loading source dataset: ${error.message}`),
          );
          console.log(chalk.yellow("⚠️ Falling back to generated datasets"));
        }
      }

      for (const size of options.sizes) {
        const tokenCount = sizeMap[size] || parseInt(size);
        console.log(
          chalk.blue(`Generating ${size} dataset (${tokenCount} tokens)...`),
        );

        let dataset: Record<string, any>;
        if (sourceDataset) {
          // If we have a source dataset, sample from it or extend it
          dataset = sampleFromDataset(sourceDataset, tokenCount);
        } else {
          // Otherwise generate a synthetic dataset
          dataset = generateSampleDataset(tokenCount);
        }

        const outputPath = path.join(options.output, `${size}-dataset.json`);

        fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
        console.log(chalk.green(`✅ Saved to ${outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error generating datasets:"));
      console.error(error);
      process.exit(1);
    }
  });

// Sample from an existing dataset or extend it to reach the desired size
function sampleFromDataset(
  sourceDataset: Record<string, any>,
  targetSize: number,
): Record<string, any> {
  const sourceKeys = Object.keys(sourceDataset);
  const sourceSize = sourceKeys.length;

  // If source is larger than target, sample randomly
  if (sourceSize >= targetSize) {
    console.log(
      chalk.blue(
        `Sampling ${targetSize} tokens from source dataset of ${sourceSize} tokens`,
      ),
    );
    const result: Record<string, any> = {};
    const selectedKeys = new Set<string>();

    // Ensure we get exactly targetSize unique keys
    while (selectedKeys.size < targetSize) {
      const randomIndex = Math.floor(Math.random() * sourceSize);
      selectedKeys.add(sourceKeys[randomIndex]);
    }

    // Create the result dataset
    for (const key of selectedKeys) {
      result[key] = sourceDataset[key];
    }

    return result;
  }

  // If source is smaller than target, use all of source and extend with generated data
  console.log(
    chalk.blue(
      `Using all ${sourceSize} tokens from source dataset and generating ${targetSize - sourceSize} additional tokens`,
    ),
  );
  const result = { ...sourceDataset };

  // Generate additional tokens to reach the target size
  const additionalTokens = generateSampleDataset(targetSize - sourceSize);

  // Add a prefix to avoid key collisions
  for (const [key, value] of Object.entries(additionalTokens)) {
    result[`generated.${key}`] = value;
  }

  return result;
}

// Generate a sample dataset with dependencies
function generateSampleDataset(size: number): Record<string, string> {
  const dataset: Record<string, string> = {};

  // Base tokens
  for (let i = 0; i < Math.ceil(size * 0.3); i++) {
    dataset[`base.size.${i}`] = `${8 + i}`;
    dataset[`base.color.${i}`] = `#${(i * 20).toString(16).padStart(6, "0")}`;
  }

  // Derived tokens with simple references
  for (let i = 0; i < Math.ceil(size * 0.3); i++) {
    const baseIndex = i % Math.ceil(size * 0.3);
    dataset[`component.padding.${i}`] = `{base.size.${baseIndex}} * 2`;
    dataset[`component.margin.${i}`] = `{component.padding.${i}} + 4`;
  }

  // Complex expressions
  for (let i = 0; i < Math.ceil(size * 0.4); i++) {
    const baseIndex1 = i % Math.ceil(size * 0.3);
    const baseIndex2 = (i + 1) % Math.ceil(size * 0.3);
    dataset[`layout.spacing.${i}`] =
      `({base.size.${baseIndex1}} + {base.size.${baseIndex2}}) / 2`;

    if (i < Math.ceil(size * 0.2)) {
      dataset[`theme.color.${i}`] = `lighten({base.color.${baseIndex1}}, 0.2)`;
    }
  }

  return dataset;
}

program.parse();
