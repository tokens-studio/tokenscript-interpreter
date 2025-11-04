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
import { processTokens } from "./processor/process";

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
  .action(async (options) => {
    await processTokens({
      path: options.input,
      outputPath: options.output,
      schemas: options.schema,
    });
  });
