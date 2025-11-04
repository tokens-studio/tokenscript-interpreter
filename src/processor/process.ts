import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import { collectJsonFiles } from "./utils/file-collector";

export type ProcessTokensOptions = {
  path: string;
  outputPath?: string;
  schemas?: string[];
};

export async function processTokens({
  path: inputPath,
  outputPath,
  schemas,
}: ProcessTokensOptions) {
  const _config = await fetchAndRegisterSchemas(schemas ?? []);

  const _jsonFiles = await collectJsonFiles(inputPath);

  // TODO: Process jsonFiles further
}
