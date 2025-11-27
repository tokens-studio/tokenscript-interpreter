import * as fs from "node:fs";
import * as readline from "node:readline";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { Interpreter, type InterpreterResult } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";
import { BaseSymbolType, getResultTypeName } from "./interpreter/symbols";
import { FlatObjectBuilder, NestedObjectBuilder } from "./processor/builders";
import { stringifyAsJson } from "./processor/builders/base";
import { collectErrors } from "./processor/errors";
import {
  collectJsonFiles,
  normalizeJsonFiles,
  processTokensFromFiles,
} from "./processor/processFiles";
import type { Theme } from "./processor/utils/theme-resolver";
import { extractSetNames, resolveThemes } from "./processor/utils/theme-resolver";
import { startRepl } from "./repl";
import type { ReferenceRecord } from "./types";
import { fetchAndRegisterSchemas } from "./utils/schema-fetcher";

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

    const outputJson = stringifyAsJson(result.output);

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

interface EvalResult {
  success: boolean;
  result?: string;
  type?: string;
  executionTime?: number;
  error?: string;
  line?: number;
  column?: number;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    const lines: string[] = [];
    rl.on("line", (line) => lines.push(line));
    rl.on("close", () => resolve(lines.join("\n")));
  });
}

function evaluateExpression(
  expression: string,
  references: ReferenceRecord,
  config?: ReturnType<typeof fetchAndRegisterSchemas> extends Promise<infer T> ? T : never,
): EvalResult {
  const startTime = performance.now();

  try {
    const lexer = new Lexer(expression);
    const parser = new Parser(lexer);
    const ast = parser.parse(false); // Allow statements, not just expressions

    if (!ast) {
      return {
        success: true,
        result: "null",
        type: "Null",
        executionTime: Math.round((performance.now() - startTime) * 100) / 100,
      };
    }

    const interpreter = new Interpreter(ast, { references, config });
    const result: InterpreterResult = interpreter.interpret();
    const executionTime = Math.round((performance.now() - startTime) * 100) / 100;

    let resultStr: string;
    let resultType: string;

    if (result === null) {
      resultStr = "null";
      resultType = "Null";
    } else if (typeof result === "string") {
      resultStr = result;
      resultType = "String";
    } else if (result instanceof BaseSymbolType) {
      resultStr = result.toString();
      resultType = result.getTypeName();
    } else {
      resultStr = String(result);
      resultType = getResultTypeName(result);
    }

    return {
      success: true,
      result: resultStr,
      type: resultType,
      executionTime,
    };
  } catch (error: unknown) {
    const executionTime = Math.round((performance.now() - startTime) * 100) / 100;
    const errorResult: EvalResult = {
      success: false,
      executionTime,
    };

    if (error instanceof Error) {
      errorResult.error = error.message;

      // Extract line/column info if available
      const errorWithLocation = error as { line?: number; column?: number; token?: { line?: number; column?: number } };
      if (typeof errorWithLocation.line === "number") {
        errorResult.line = errorWithLocation.line;
      } else if (errorWithLocation.token?.line) {
        errorResult.line = errorWithLocation.token.line;
      }
      if (typeof errorWithLocation.column === "number") {
        errorResult.column = errorWithLocation.column;
      } else if (errorWithLocation.token?.column) {
        errorResult.column = errorWithLocation.token.column;
      }
    } else {
      errorResult.error = String(error);
    }

    return errorResult;
  }
}

program
  .command("eval [expression]")
  .description("Evaluate a TokenScript expression and output JSON result")
  .option("--stdin", "Read expression from stdin instead of argument")
  .option("--schema <uris...>", "Schema URIs to fetch and register (e.g., color schemas)")
  .option("--refs <json>", "JSON object of variable references (e.g., '{\"x\": 10}')")
  .action(async (expression: string | undefined, options: { stdin?: boolean; schema?: string[]; refs?: string }) => {
    let code: string;

    // Get expression from argument or stdin
    if (options.stdin) {
      code = await readStdin();
    } else if (expression) {
      code = expression;
    } else {
      const errorResult: EvalResult = {
        success: false,
        error: "No expression provided. Use an argument or --stdin flag.",
      };
      console.log(JSON.stringify(errorResult));
      process.exit(1);
    }

    // Parse references if provided
    let references: ReferenceRecord = {};
    if (options.refs) {
      try {
        references = JSON.parse(options.refs);
      } catch (parseError) {
        const errorResult: EvalResult = {
          success: false,
          error: `Invalid JSON in --refs: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        };
        console.log(JSON.stringify(errorResult));
        process.exit(1);
      }
    }

    // Load schemas if provided
    let config;
    try {
      config = await fetchAndRegisterSchemas(options.schema ?? []);
    } catch (schemaError) {
      const errorResult: EvalResult = {
        success: false,
        error: `Failed to load schemas: ${schemaError instanceof Error ? schemaError.message : String(schemaError)}`,
      };
      console.log(JSON.stringify(errorResult));
      process.exit(1);
    }

    // Evaluate the expression
    const result = evaluateExpression(code, references, config);
    console.log(JSON.stringify(result));

    if (!result.success) {
      process.exit(1);
    }
  });

export { program };

// Auto-run only if not in test environment
if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
