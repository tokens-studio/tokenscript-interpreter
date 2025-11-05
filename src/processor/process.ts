import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import { collectJsonFiles } from "./utils/file-collector";
import { resolveThemes } from "./utils/theme-resolver";

export type ProcessTokensOptions = {
  path: string;
  outputPath?: string;

  schemas?: string[];

  activeSets?: string[];
  activeTheme?: string;
};


/**
 * Props
 * `activeSets` an ordered collection of set name to resolve
 * `activeTheme` a string of the theme to collect.
 */
export async function processTokens({
  path: inputPath,
  outputPath,
  schemas,
  activeSets,
  activeTheme,
}: ProcessTokensOptions) {
  const config = await fetchAndRegisterSchemas(schemas ?? []);

  const jsonFiles = await collectJsonFiles(inputPath);

  const themes = resolveThemes(jsonFiles);

}

processTokens({ path: "data/examples/tokens.json" })
