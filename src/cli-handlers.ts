import * as fs from "node:fs";
import { evaluateExpression } from "./lib/eval";
import type { ProcessorOutput } from "./processor";
import { FlatObjectBuilder, NestedObjectBuilder } from "./processor/builders";
import { stringifyAsJson } from "./processor/builders/base";
import { collectErrors } from "./processor/errors";
import {
  collectJsonFiles,
  normalizeJsonFiles,
  processTokensFromFiles,
} from "./processor/processFiles";
import { hasAnyIssues } from "./processor/resolver/issue-helpers";
import type { Theme } from "./processor/utils/theme-resolver";
import { extractSetNames, resolveThemes } from "./processor/utils/theme-resolver";
import type { ReferenceRecord } from "./types";
import { readStdin } from "./utils/io";
import { fetchAndRegisterSchemas } from "./utils/schema-fetcher";

/**
 * Generic CLI result structure
 * Contains typed data, exit code, and optional error information
 */
export interface CliResult<T = unknown> {
  /** Exit code for the command (0 = success) */
  exitCode: number;
  /** Typed data to be output */
  data?: T;
  /** Error message if command failed */
  error?: string;
  /** Additional errors (e.g., validation errors) */
  errors?: unknown;
}

/**
 * Print CLI result to console
 * Handles stdout/stderr and exit code
 */
export function printCliResult<T>(result: CliResult<T>): void {
  // Print errors to stderr
  if (result.error) {
    console.error(result.error);
  }

  if (result.errors) {
    try {
      console.error(JSON.stringify({ errors: result.errors }, null, 2));
    } catch (_e) {
      console.error("Failed to serialize errors:", result.errors);
    }
  }

  // Print data to stdout
  if (result.data !== undefined) {
    try {
      const output =
        typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2);
      console.log(output);
    } catch (e) {
      console.error("Failed to serialize output:", e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  }

  process.exit(result.exitCode);
}

// ============================================================================
// Process Command
// ============================================================================

export interface ProcessCommandOptions {
  input: string;
  output?: string;
  schema?: string[];
  sets?: string;
  theme?: string;
  format?: "nested" | "flat";
  logLevel?: "warn" | "error" | "none";
  strict?: boolean;
}

export interface ProcessCommandData {
  /** Processed tokens as a Map or object depending on builder */
  output: ProcessorOutput["output"];
  /** Raw processor result for advanced inspection */
  processorResult: ProcessorOutput;
}

/**
 * Process tokens command handler
 * Extracted from CLI for testability
 */
export async function handleProcessCommand(
  options: ProcessCommandOptions,
): Promise<CliResult<ProcessCommandData>> {
  try {
    // Select builder based on format option
    const builder = options.format === "flat" ? new FlatObjectBuilder() : new NestedObjectBuilder();

    const processorResult = await processTokensFromFiles({
      path: options.input,
      outputPath: options.output,
      schemas: options.schema,
      activeSets: options.sets ? options.sets.split(",").map((s: string) => s.trim()) : undefined,
      activeTheme: options.theme,
      builder,
    });

    const hasErrors = hasAnyIssues(processorResult.issues);
    const shouldShowErrors = options.logLevel === "warn" || options.strict;
    const exitCode = options.strict && hasErrors ? 1 : 0;

    // Write to file if output path is specified
    if (options.output) {
      try {
        const outputJson = stringifyAsJson(processorResult.output);
        fs.writeFileSync(options.output, outputJson);
      } catch (e) {
        return {
          exitCode: 1,
          error: `Failed to write output file: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    return {
      exitCode,
      data: {
        output: processorResult.output,
        processorResult,
      },
      errors: shouldShowErrors && hasErrors ? collectErrors(processorResult) : undefined,
    };
  } catch (error) {
    return {
      exitCode: 1,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Inspect Command
// ============================================================================

export interface InspectCommandOptions {
  input: string;
}

export interface InspectCommandData {
  sets: string[];
  themes?: Record<string, string[]>;
}

/**
 * Inspect tokens command handler
 * Extracted from CLI for testability
 */
export async function handleInspectCommand(
  options: InspectCommandOptions,
): Promise<CliResult<InspectCommandData>> {
  try {
    const jsonFiles = await collectJsonFiles(options.input);
    const normalized = normalizeJsonFiles(jsonFiles);

    const themesResult = resolveThemes(normalized);
    const sets = Object.keys(normalized).filter((key) => !key.startsWith("$"));

    const data: InspectCommandData = { sets };

    if (themesResult) {
      const [_, themes] = themesResult;
      data.themes = Object.fromEntries(
        themes.map((theme: Theme) => [theme.name, extractSetNames(theme.selectedTokenSets)]),
      );
    }

    return {
      exitCode: 0,
      data,
    };
  } catch (error) {
    return {
      exitCode: 1,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Eval Command
// ============================================================================

export interface EvalCommandOptions {
  expression?: string;
  stdin?: boolean;
  schema?: string[];
  refs?: string;
}

export interface EvalCommandData {
  success: boolean;
  error?: string;
  result?: unknown;
}

/**
 * Eval expression command handler
 * Extracted from CLI for testability
 */
export async function handleEvalCommand(
  options: EvalCommandOptions,
): Promise<CliResult<EvalCommandData>> {
  try {
    const code = options.stdin ? await readStdin() : options.expression;

    if (!code) {
      return {
        exitCode: 1,
        data: {
          success: false,
          error: "No expression provided",
        },
      };
    }

    let references: ReferenceRecord = {};
    if (options.refs) {
      try {
        references = JSON.parse(options.refs) as ReferenceRecord;
      } catch (parseError) {
        return {
          exitCode: 1,
          data: {
            success: false,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          },
        };
      }
    }

    let config: Awaited<ReturnType<typeof fetchAndRegisterSchemas>>;
    try {
      config = await fetchAndRegisterSchemas(options.schema ?? []);
    } catch (schemaError) {
      return {
        exitCode: 1,
        data: {
          success: false,
          error: schemaError instanceof Error ? schemaError.message : String(schemaError),
        },
      };
    }

    const evalResult = evaluateExpression(code, { references, config, allowStatements: false });

    return {
      exitCode: evalResult.success ? 0 : 1,
      data: evalResult,
    };
  } catch (error) {
    return {
      exitCode: 1,
      data: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// ============================================================================
// Reference Parsing
// ============================================================================

export type ParseReferencesResult =
  | { success: true; references: ReferenceRecord }
  | { success: false; error: string };

/**
 * Parse reference strings in key:value format into a ReferenceRecord.
 * Values are parsed as JSON when possible (numbers, arrays), otherwise treated as strings.
 */
export function parseReferences(refs: string[] | undefined): ParseReferencesResult {
  const references: ReferenceRecord = {};

  if (!refs) {
    return { success: true, references };
  }

  for (const ref of refs) {
    const colonIndex = ref.indexOf(":");
    if (colonIndex === -1) {
      return {
        success: false,
        error: `Invalid reference format: "${ref}". Expected key:value`,
      };
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

  return { success: true, references };
}
