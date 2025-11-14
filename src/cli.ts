import * as fs from "node:fs";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { FlatObjectBuilder, NestedObjectBuilder } from "./processor/builders";
import { collectErrors } from "./processor/errors";
import {
  collectJsonFiles,
  normalizeJsonFiles,
  processTokensFromFiles,
} from "./processor/processFiles";
import type { Theme } from "./processor/utils/theme-resolver";
import { extractSetNames, resolveThemes } from "./processor/utils/theme-resolver";
import { startRepl } from "./repl";

const program = new Command();

program
  .name("tokenscript")
  .description("TokenScript Interpreter CLI - A command-line interface for TokenScript language")
  .version(packageJson.version);

program
  .command("repl")
  .description("Start interactive REPL mode for TokenScript")
  .option("--schema <uris...>", "Schema URIs to fetch and register")
  .action(async (options) => {
    await startRepl(options.schema);
  });

program
  .command("process")
  .description("Process tokens from a file")

  // IO
  .requiredOption(
    "--input <path>",
    "Path to a json file, archive or directory containing design tokens.",
  )
  .option("--output <path>", "Output file path (if not provided, prints to console)")

  // Configuration
  .option("--schema <uris...>", "Schema URIs to fetch and register")

  // Set theme selection
  .option("--sets <sets>", "Comma-separated list of token sets to process")
  .option("--theme <theme>", "Theme name to use for token set selection")

  // Output format
  .option("--format <format>", "Output format: nested (default) or flat", "nested")

  // Logging
  .option("--log-level <level>", "Log level (warn, error, none)", "none")
  .option("--strict", "Output errors if any exist, otherwise output tokens", false)

  .action(async (options) => {
    // Select builder based on format option
    const builder = options.format === "flat" ? new FlatObjectBuilder() : new NestedObjectBuilder();

    const result = await processTokensFromFiles({
      path: options.input,
      outputPath: options.output,
      schemas: options.schema,
      activeSets: options.sets ? options.sets.split(",").map((s: string) => s.trim()) : undefined,
      activeTheme: options.theme,
      output: "symbols",
      builder,
    });

    const hasErrors = result.errors.size > 0;
    if ((options.logLevel === "warn" || options.strict) && hasErrors) {
      const errors = collectErrors(result);
      console.error(JSON.stringify({ errors }, null, 2));
    }

    if (options.strict && hasErrors) {
      process.exit(1);
    }

    const outputJson = JSON.stringify(result.output, null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, outputJson);
    } else {
      console.log(outputJson);
    }
  });

program
  .command("inspect")
  .description("Inspect themes and sets from a token file")
  .requiredOption(
    "--input <path>",
    "Path to a json file, archive or directory containing design tokens.",
  )
  .action(async (options) => {
    const jsonFiles = await collectJsonFiles(options.input);
    const normalized = normalizeJsonFiles(jsonFiles);

    const themesResult = resolveThemes(normalized);
    const sets = Object.keys(normalized).filter((key) => !key.startsWith("$"));

    const output: { sets: string[]; themes?: Record<string, string[]> } = { sets };

    if (themesResult) {
      const [_, themes] = themesResult;
      output.themes = Object.fromEntries(
        themes.map((theme: Theme) => [theme.name, extractSetNames(theme.selectedTokenSets)]),
      );
    }

    console.log(JSON.stringify(output, null, 2));
  });

export { program };

// Auto-run only if not in test environment
if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
