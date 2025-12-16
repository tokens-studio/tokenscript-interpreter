import * as fs from "node:fs";
import * as path from "node:path";
import type { EvalCommandOptions, ProcessCommandOptions } from "@src/cli-handlers";
import { handleEvalCommand, handleInspectCommand, handleProcessCommand } from "@src/cli-handlers";
import type { ProcessorOutput } from "@src/processor";
import { StringMapBuilder } from "@src/processor";
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
    builder: new StringMapBuilder(),
    ...options,
  });
}

/**
 * Run CLI process command
 * Directly calls the handler for testability (no process spawning)
 */
export async function runProcessCommand(options: Omit<ProcessCommandOptions, "sets"> & { sets?: string[] }) {
  return handleProcessCommand({
    ...options,
    sets: options.sets?.join(","),
  });
}

/**
 * Run CLI inspect command
 * Directly calls the handler for testability (no process spawning)
 */
export async function runInspectCommand(input: string) {
  return handleInspectCommand({ input });
}

/**
 * Run CLI eval command
 * Directly calls the handler for testability (no process spawning)
 */
export async function runEvalCommand(options: EvalCommandOptions) {
  return handleEvalCommand(options);
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
  if (result.issues && result.issues.size > 0) {
    const errorMessages = Array.from(result.issues.entries())
      .map(([key, issues]) => `${key}: ${issues.map((i) => i.message).join(", ")}`)
      .join("\n");
    throw new Error(`Expected no errors but found:\n${errorMessages}`);
  }
}

/**
 * Assert that a result has specific errors
 */
export function assertHasErrors(result: ProcessorOutput, expectedErrorKeys: string[]): void {
  for (const key of expectedErrorKeys) {
    if (!result.issues?.has(key)) {
      throw new Error(`Expected error for key '${key}' but none found`);
    }
  }
}

/**
 * Get error message for a specific token
 */
export function getErrorMessage(result: ProcessorOutput, tokenKey: string): string | undefined {
  const issues = result.issues?.get(tokenKey);
  return issues?.[0]?.message;
}
