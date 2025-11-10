import * as fs from "node:fs";
import type { interpreterResult } from "@interpreter/interpreter";
import {
  BooleanSymbol,
  ColorSymbol,
  DictionarySymbol,
  isTokenscriptSymbol,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { collectErrors } from "./processor/process";
import {
  collectJsonFiles,
  normalizeJsonFiles,
  processTokensFromFiles,
} from "./processor/processFiles";
import type { Theme } from "./processor/utils/theme-resolver";
import { extractSetNames, resolveThemes } from "./processor/utils/theme-resolver";
import { startRepl } from "./repl";

const program = new Command();

function serializeSymbolValue(symbol: ISymbolType): unknown {
  if (symbol instanceof StringSymbol) {
    return symbol.value;
  }
  if (symbol instanceof NumberSymbol) {
    return symbol.value;
  }
  if (symbol instanceof BooleanSymbol) {
    return symbol.value;
  }
  if (symbol instanceof NullSymbol) {
    return null;
  }
  if (symbol instanceof NumberWithUnitSymbol) {
    return symbol.toString();
  }
  if (symbol instanceof ColorSymbol) {
    return symbol.toString();
  }
  if (symbol instanceof ListSymbol) {
    return symbol.elements.map((item) => serializeSymbolValue(item));
  }
  if (symbol instanceof DictionarySymbol) {
    const obj: Record<string, unknown> = {};
    for (const [key, child] of symbol.value.entries()) {
      obj[key] = serializeSymbolValue(child);
    }
    return obj;
  }
  return symbol.toString();
}

function toSerializableValue(value: string | interpreterResult): unknown {
  if (typeof value === "string") {
    return value;
  }
  if (value === null) {
    return null;
  }
  if (isTokenscriptSymbol(value)) {
    return serializeSymbolValue(value);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown): void {
  if (path.length === 0) {
    return;
  }
  const segments = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i];
    const isLast = i === segments.length - 1;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    if (!isPlainObject(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
}

function buildNestedTokens(
  tokens: Map<string, string | interpreterResult>,
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [path, value] of tokens.entries()) {
    const plainValue = toSerializableValue(value);
    if (typeof plainValue === "undefined") {
      continue;
    }
    setNestedValue(root, path, plainValue);
  }
  return root;
}

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
    const result = await processTokensFromFiles({
      path: options.input,
      outputPath: options.output,
      schemas: options.schema,
      activeSets: options.sets ? options.sets.split(",").map((s: string) => s.trim()) : undefined,
      activeTheme: options.theme,
      output: "symbols",
    });

    const hasErrors = result.errors.size > 0;
    if ((options.logLevel === "warn" || options.strict) && hasErrors) {
      const errors = collectErrors(result);
      console.error(JSON.stringify({ errors }, null, 2));
    }

    if (options.strict && hasErrors) {
      process.exit(1);
    }

    const nestedTokens = buildNestedTokens(result.tokens);
    const output = JSON.stringify(nestedTokens, null, 2);

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
