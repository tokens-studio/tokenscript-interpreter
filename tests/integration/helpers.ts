import * as fs from "node:fs";
import * as path from "node:path";
import type { ProcessorOutput } from "@src/processor";
import { processTokensFromFiles } from "@src/processor/processFiles";

export interface TokenFile {
  [key: string]: any;
}

export interface TestContext {
  tempDir: string;
  cliPath: string;
}

/**
 * Create a test context with temporary directory and CLI path
 */
export function createTestContext(testName: string): TestContext {
  const tempDir = path.join(process.cwd(), "tests", "integration", "temp", testName);
  const cliPath = path.join(process.cwd(), "src", "cli.ts");
  return { tempDir, cliPath };
}

/**
 * Setup temporary directory for tests
 */
export async function setupTempDir(tempDir: string): Promise<void> {
  await fs.promises.mkdir(tempDir, { recursive: true });
}

/**
 * Cleanup temporary directory after tests
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
}

/**
 * Write a token file to the temporary directory
 */
export async function writeTokenFile(tempDir: string, fileName: string, tokens: TokenFile): Promise<string> {
  const filePath = path.join(tempDir, fileName);
  await fs.promises.writeFile(filePath, JSON.stringify(tokens, null, 2));
  return filePath;
}

/**
 * Write multiple token files to the temporary directory
 */
export async function writeTokenFiles(tempDir: string, files: Record<string, TokenFile>): Promise<Record<string, string>> {
  const filePaths: Record<string, string> = {};

  for (const [fileName, tokens] of Object.entries(files)) {
    filePaths[fileName] = await writeTokenFile(tempDir, fileName, tokens);
  }

  return filePaths;
}

/**
 * Read a JSON file from disk
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Process tokens from a file and return the result
 */
export async function processTokenFile(
  tempDir: string,
  fileName: string,
  tokens: TokenFile,
  options?: Partial<{
    outputPath?: string;
    schemas?: string[];
    activeSets?: string[];
    activeTheme?: string;
  }>,
): Promise<ProcessorOutput> {
  const filePath = await writeTokenFile(tempDir, fileName, tokens);
  return processTokensFromFiles({
    path: filePath,
    ...options,
  });
}

/**
 * Run a CLI command and return stdout, stderr, and exit code
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Mock console.log and console.error to capture output
 */
function mockConsole(): {
  stdout: string[];
  stderr: string[];
  restore: () => void;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    stdout.push(args.map(String).join(" "));
  };

  console.error = (...args: any[]) => {
    stderr.push(args.map(String).join(" "));
  };

  return {
    stdout,
    stderr,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
    },
  };
}

/**
 * Mock process.exit to prevent test runner from exiting
 */
function mockProcessExit(): {
  exitCode: number;
  restore: () => void;
} {
  const originalExit = process.exit;
  let exitCode = 0;

  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`Process exited with code ${exitCode}`);
  }) as any;

  return {
    exitCode,
    restore: () => {
      process.exit = originalExit;
    },
  };
}

export async function runCliCommand(command: string, args: string[] = []): Promise<CliResult> {
  const consoleCapture = mockConsole();
  const exitMock = mockProcessExit();

  try {
    // Import the CLI module
    const { program } = await import("@src/cli");

    // Parse with mock argv - from: "node" expects full argv including node and script name
    await program.parseAsync(["node", "cli.js", command, ...args], { from: "node" });

    return {
      stdout: consoleCapture.stdout.join("\n"),
      stderr: consoleCapture.stderr.join("\n"),
      exitCode: 0,
    };
  } catch (error: any) {
    // Check if this is an exit error
    const exitMatch = error.message?.match(/Process exited with code (\d+)/);
    if (exitMatch) {
      return {
        stdout: consoleCapture.stdout.join("\n"),
        stderr: consoleCapture.stderr.join("\n"),
        exitCode: Number.parseInt(exitMatch[1], 10),
      };
    }

    // Any other error
    return {
      stdout: consoleCapture.stdout.join("\n"),
      stderr: consoleCapture.stderr.join("\n") || error.message,
      exitCode: 1,
    };
  } finally {
    consoleCapture.restore();
    exitMock.restore();
  }
}

/**
 * Run CLI process command
 */
export interface ProcessCommandOptions {
  input: string;
  output?: string;
  sets?: string[];
  theme?: string;
  logLevel?: "warn" | "error" | "none";
  strict?: boolean;
  schemas?: string[];
}

export async function runProcessCommand(options: ProcessCommandOptions): Promise<CliResult> {
  const args: string[] = ["--input", options.input];

  if (options.output) args.push("--output", options.output);
  if (options.sets) args.push("--sets", options.sets.join(","));
  if (options.theme) args.push("--theme", options.theme);
  if (options.logLevel) args.push("--log-level", options.logLevel);
  if (options.strict) args.push("--strict");
  if (options.schemas) {
    args.push("--schema");
    args.push(...options.schemas);
  }

  return runCliCommand("process", args);
}

/**
 * Run CLI inspect command
 */
export async function runInspectCommand(input: string): Promise<{ sets: string[]; themes?: Record<string, string[]> }> {
  const result = await runCliCommand("inspect", ["--input", input]);

  if (result.exitCode !== 0) {
    throw new Error(`Inspect command failed: ${result.stderr}`);
  }

  return JSON.parse(result.stdout);
}

/**
 * Create a token with standard format
 */
export function createToken(value: string, type: string, description?: string): any {
  const token: any = {
    $value: value,
    $type: type,
  };

  if (description) {
    token.$description = description;
  }

  return token;
}

/**
 * Create a theme definition
 */
export interface ThemeDefinition {
  name: string;
  selectedTokenSets: Record<string, "enabled" | "source"> | Array<{ id: string; status: "enabled" | "source" }>;
  figmaCollectionId?: string;
  figmaModeId?: string;
  group?: string;
}

export function createTheme(
  name: string,
  selectedTokenSets: string[] | Record<string, "enabled" | "source">,
  options?: Partial<ThemeDefinition>,
): ThemeDefinition {
  const theme: ThemeDefinition = {
    name,
    selectedTokenSets: Array.isArray(selectedTokenSets) ? selectedTokenSets.map((id) => ({ id, status: "enabled" as const })) : selectedTokenSets,
    ...options,
  };

  return theme;
}

/**
 * Assert that a result has no errors
 */
export function assertNoErrors(result: ProcessorOutput): void {
  if (result.errors.size > 0) {
    const errorMessages = Array.from(result.errors.entries())
      .map(([key, error]) => `${key}: ${error.message}`)
      .join("\n");
    throw new Error(`Expected no errors but found:\n${errorMessages}`);
  }
}

/**
 * Assert that a result has specific errors
 */
export function assertHasErrors(result: ProcessorOutput, expectedErrorKeys: string[]): void {
  for (const key of expectedErrorKeys) {
    if (!result.errors.has(key)) {
      throw new Error(`Expected error for key '${key}' but none found`);
    }
  }
}

/**
 * Get error message for a specific token
 */
export function getErrorMessage(result: ProcessorOutput, tokenKey: string): string | undefined {
  return result.errors.get(tokenKey)?.message;
}
