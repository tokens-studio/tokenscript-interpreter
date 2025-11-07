import { processTokens } from "./process";
import type { ProcessorOutput } from "./TokenProcessor";
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

export type ProcessFilesOptions = {
  path: string;
  outputPath?: string;
  schemas?: string[];
  activeSets?: string[];
  activeTheme?: string;
};

/**
 * Process tokens from files on disk.
 * Node.js only - requires file system access.
 *
 * @param options - Configuration for file reading and processing
 * @returns ProcessorOutput with resolved tokens
 */
export async function processTokensFromFiles({
  path: inputPath,
  schemas,
  activeSets,
  activeTheme,
}: ProcessFilesOptions): Promise<ProcessorOutput> {
  // Step 1: Collect JsonFiles from disk
  const jsonFiles = await collectJsonFilesUtil(inputPath);

  // Step 2: Normalize to flat structure
  const normalizedFiles = normalizeJsonFiles(jsonFiles);

  // Step 3+: Core processing with schema registration
  return processTokens(normalizedFiles, {
    schemas,
    activeSets,
    activeTheme,
  });
}
