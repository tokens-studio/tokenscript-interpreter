import * as fs from "node:fs";
import type { Config } from "@interpreter/config";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import {
  buildThemeTree,
  interpretTokens,
  interpretTokensets,
  permutateTokensets,
  processThemes,
} from "@src/tokenset-processor";
import type { ReferenceRecord } from "@src/types";
import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";

import { Command } from "commander";
import * as readlineSync from "readline-sync";
import * as yauzl from "yauzl";
import packageJson from "../package.json" with { type: "json" };
import { collectErrors, processTokens } from "./processor/process";

const program = new Command();

program
  .name("tokenscript")
  .description("TokenScript Interpreter CLI - A command-line interface for TokenScript language")
  .version(packageJson.version);

// program
//   .command("repl")
//   .description("Start interactive REPL mode for TokenScript")
//   .option("--schema <uris...>", "Schema URIs to fetch and register")
//   .action(async (options) => {
//     await interactiveMode(options.schema);
//   });

program
  .command("process")
  .description("Process tokens from a file")
  .requiredOption(
    "--input <path>",
    "Path to a json file, archive or directory containing design tokens.",
  )
  .option("--output <path>", "Output file path (if not provided, prints to console)")
  .option("--schema <uris...>", "Schema URIs to fetch and register")
  .option("--sets <sets>", "Comma-separated list of token sets to process")
  .option("--theme <theme>", "Theme name to use for token set selection")
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

program.parse();
