import * as fs from "node:fs";

import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { collectErrors, normalizeJsonFiles, processTokens } from "./processor/process";
import { collectJsonFiles } from "./processor/utils/file-collector";
import { resolveThemes } from "./processor/utils/theme-resolver";
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

  // Logging
  .option("--log-level <level>", "Log level (warn, error, none)", "none")
  .option("--strict", "Output errors if any exist, otherwise output tokens", false)

  .action(async (options) => {
    const result = await processTokens({
      path: options.input,
      outputPath: options.output,
      schemas: options.schema,
      activeSets: options.sets ? options.sets.split(",").map((s: string) => s.trim()) : undefined,
      activeTheme: options.theme,
    });

    const hasErrors = result.errors.size > 0;
    if ((options.logLevel === "warn" || options.strict) && hasErrors) {
      const errors = collectErrors(result);
      console.error(JSON.stringify({ errors }, null, 2));
    }

    if (options.strict && hasErrors) {
      process.exit(1);
    }

    const output = JSON.stringify(Object.fromEntries(result.tokens), null, 2);

    if (options.output) {
      fs.writeFileSync(options.output, output);
    } else {
      console.log(output);
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
    const themes = themesResult ? themesResult[1] : [];
    const sets = Object.keys(normalized).filter((key) => !key.startsWith("$"));

    const output = {
      themes: themes.map((theme) => theme.name),
      sets,
    };

    console.log(JSON.stringify(output, null, 2));
  });

program.parse();
