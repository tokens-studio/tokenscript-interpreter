import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import {
  handleEvalCommand,
  handleInspectCommand,
  handleProcessCommand,
  printCliResult,
} from "./cli-handlers";
import { stringifyAsJson } from "./processor/builders/base";
import { startRepl } from "./repl";
import type { ReferenceRecord } from "./types";

const program = new Command();

program
  .name("tokenscript")
  .description("TokenScript Interpreter CLI - A command-line interface for TokenScript language")
  .version(packageJson.version);

program
  .command("repl")
  .description("Start interactive REPL mode for TokenScript")
  .option("--schema <uris...>", "Schema URIs to fetch and register")
  .option("--mode <mode>", "Execution mode: inline or script")
  .option(
    "--reference <refs...>",
    "Reference values in key:value format (can be specified multiple times)",
  )
  .action(async (options) => {
    // Parse references from key:value format
    const references: ReferenceRecord = {};
    if (options.reference) {
      for (const ref of options.reference) {
        const colonIndex = ref.indexOf(":");
        if (colonIndex === -1) {
          console.error(`Invalid reference format: "${ref}". Expected key:value`);
          process.exit(1);
        }
        const key = ref.slice(0, colonIndex);
        const value = ref.slice(colonIndex + 1);
        // Try to parse as JSON, otherwise use as string
        try {
          const parsed = JSON.parse(value);
          // Accept strings, numbers, and arrays of these
          if (typeof parsed === "string" || typeof parsed === "number" || Array.isArray(parsed)) {
            references[key] = parsed;
          } else {
            references[key] = value;
          }
        } catch {
          references[key] = value;
        }
      }
    }
    await startRepl({
      mode: options.mode === "script" ? "script" : "inline",
      schemas: options.schema,
      references,
    });
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
    const result = await handleProcessCommand(options);

    // If output file was specified, don't print to stdout (already written to file)
    if (options.output && result.data) {
      // Only print errors if any, but don't print the data
      printCliResult({
        exitCode: result.exitCode,
        error: result.error,
        errors: result.errors,
        data: undefined,
      });
    } else if (result.data) {
      // Print to stdout - serialize the output
      try {
        const outputJson = stringifyAsJson(result.data.output);
        printCliResult({
          exitCode: result.exitCode,
          error: result.error,
          errors: result.errors,
          data: outputJson,
        });
      } catch (e) {
        printCliResult({
          exitCode: 1,
          error: `Failed to serialize output: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    } else {
      // Error case - no data
      printCliResult(result);
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
    const result = await handleInspectCommand(options);
    printCliResult(result);
  });

program
  .command("eval [expression]")
  .description("Evaluate a TokenScript expression and output JSON result")
  .option("--stdin", "Read expression from stdin")
  .option("--schema <uris...>", "Schema URIs to fetch and register")
  .option("--refs <json>", "JSON object of variable references")
  .action(async (expression: string | undefined, options) => {
    const result = await handleEvalCommand({ expression, ...options });
    printCliResult(result);
  });

export { program };

// Auto-run only if not in test environment
if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
