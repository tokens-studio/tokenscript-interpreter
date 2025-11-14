import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import { processTokenSets } from "./process";
import type { ProcessFilesOptions, ProcessResult } from "./types";
import { collectJsonFiles as collectJsonFilesUtil } from "./utils/file-collector";
import { normalizeJsonFiles as normalizeJsonFilesUtil } from "./utils/normalizer";

export { collectJsonFilesUtil as collectJsonFiles };
export { normalizeJsonFilesUtil as normalizeJsonFiles };

/**
 * Process tokens from files on disk.
 */
export async function processTokensFromFiles<T = any>({
  path: inputPath,
  schemas,
  activeSets,
  activeTheme,
  output,
  builder,
}: ProcessFilesOptions<T>): Promise<ProcessResult<T>> {
  await fetchAndRegisterSchemas(schemas ?? []);

  const jsonFiles = await collectJsonFilesUtil(inputPath);

  const normalizedFiles = normalizeJsonFilesUtil(jsonFiles);

  return processTokenSets<T>(normalizedFiles, {
    activeSets,
    activeTheme,
    output,
    builder,
  });
}
