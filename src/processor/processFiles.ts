import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import type { TokenBuilder } from "./builders";
import { type ProcessResult, processTokenSets } from "./process";
import { collectJsonFiles as collectJsonFilesUtil } from "./utils/file-collector";

function normalizeJsonFiles(jsonFiles: Record<string, unknown>): Record<string, unknown> {
  const isSingleEntry = Object.keys(jsonFiles).length === 1;

  if (!isSingleEntry) {
    return jsonFiles; // Already multi-file
  }

  const [, content] = Object.entries(jsonFiles)[0];

  if (typeof content !== "object" || content === null) {
    throw new Error("File content is not an object");
  }

  // Check if single file has metadata keys (like $themes, $metadata)
  const hasMetadata = Object.keys(content as Record<string, unknown>).some((key) =>
    key.startsWith("$"),
  );
  if (hasMetadata) {
    return content as Record<string, unknown>;
  }

  return jsonFiles;
}

// Export for CLI usage
export { collectJsonFilesUtil as collectJsonFiles };
export { normalizeJsonFiles };

export type ProcessFilesOptions<T = any> = {
  path: string;
  outputPath?: string;
  schemas?: string[];
  activeSets?: string[];
  activeTheme?: string;
  output?: "string" | "symbols";
  builder?: TokenBuilder<T>;
};

/**
 * Process tokens from files on disk.
 * Node.js only - requires file system access.
 * Handles async schema registration before processing.
 *
 * @param options - Configuration for file reading and processing
 * @returns ProcessResult with resolved tokens and output structure
 */
export async function processTokensFromFiles<T = any>({
  path: inputPath,
  schemas,
  activeSets,
  activeTheme,
  output,
  builder,
}: ProcessFilesOptions<T>): Promise<ProcessResult<T>> {
  // Step 1: Register schemas (async)
  await fetchAndRegisterSchemas(schemas ?? []);

  // Step 2: Collect JsonFiles from disk
  const jsonFiles = await collectJsonFilesUtil(inputPath);

  // Step 3: Normalize to flat structure
  const normalizedFiles = normalizeJsonFiles(jsonFiles);

  // Step 4: Core synchronous processing
  return processTokenSets<T>(normalizedFiles, {
    activeSets,
    activeTheme,
    output,
    builder,
  });
}
