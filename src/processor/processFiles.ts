import { Config } from "@interpreter/config";
import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import { processTokenSets } from "./process";
import type { ProcessFilesOptions, ProcessResult } from "./types";
import { collectJsonFiles } from "./utils/file-collector";
import { normalizeJsonFiles } from "./utils/normalizer";

export { collectJsonFiles };
export { normalizeJsonFiles };

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

  const jsonFiles = await collectJsonFiles(inputPath);

  const normalizedFiles = normalizeJsonFiles(jsonFiles);

  const config = new Config();

  return processTokenSets<T>(normalizedFiles, {
    activeSets,
    activeTheme,
    output,
    builder,
    config,
  });
}
