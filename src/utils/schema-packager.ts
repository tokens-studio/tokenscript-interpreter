import type { ColorSpecification } from "@interpreter/config/managers/color/schema";
import type { FunctionSpecification } from "@interpreter/config/managers/functions/schema";
import { fetchTokenScriptSchema } from "./schema-fetcher";
import {
  buildFetchUrl,
  buildSchemaUri,
  DEFAULT_REGISTRY_URL,
  parseVersionString,
} from "./schema-uri";

type SchemaContent = ColorSpecification | FunctionSpecification;

interface SchemaFetchConfig {
  name: string;
  version?: string;
  baseUrl?: string;
}

interface SchemaHardcodedConfig {
  url: string;
  content: SchemaContent;
}

interface SchemaMapConfig {
  name: string;
  schemas: Array<SchemaFetchConfig | SchemaHardcodedConfig>;
}

interface GenerateConfig {
  maps: SchemaMapConfig[];
  baseUrl?: string;
  timeout?: number;
}

interface PackagerConfig extends GenerateConfig {
  outputPath: string;
}

async function fetchRemoteSchema(
  name: string,
  version: string,
  baseUrl: string,
  timeout = 10000,
): Promise<[string, SchemaContent] | null> {
  try {
    const schemaUri = buildFetchUrl(name, version, { baseUrl, category: "schema" });
    const result = await fetchTokenScriptSchema(schemaUri, { timeout });

    const uri = buildSchemaUri({
      baseUrl,
      category: "schema",
      name,
      version: parseVersionString(version),
    });
    return [uri, result.content];
  } catch (error) {
    console.warn(
      `  ⚠ Could not fetch schema ${name}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function processSchemas(
  schemas: SchemaMapConfig["schemas"],
  baseUrl: string,
  timeout: number,
): Promise<Map<string, SchemaContent>> {
  const schemaMap = new Map<string, SchemaContent>();

  for (const schema of schemas) {
    if ("name" in schema) {
      const fetchBaseUrl = schema.baseUrl || baseUrl;
      const version = schema.version || "latest";
      const result = await fetchRemoteSchema(schema.name, version, fetchBaseUrl, timeout);
      if (result) {
        const [url, content] = result;
        schemaMap.set(`${url}/0/`, content);
        console.log(`  ✓ ${schema.name}`);
      }
    } else {
      schemaMap.set(schema.url, schema.content);
      const schemaName = schema.content.name || "unknown";
      console.log(`  ✓ ${schemaName} (hardcoded)`);
    }
  }

  return schemaMap;
}

function generateFileContent(
  maps: Array<{ name: string; map: Map<string, SchemaContent> }>,
): string {
  const mapExports = maps
    .map(({ name, map }) => {
      const entries = Array.from(map.entries())
        .map(([url, spec]) => `  ['${url}', ${JSON.stringify(spec)}]`)
        .join(",\n");

      return `export const ${name} = new Map<string, any>([\n${entries}\n]);`;
    })
    .join("\n\n");

  return `// Auto-generated file - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// This file contains schemas packaged at build time

${mapExports}
`;
}

/**
 * Generate schema file content without performing any I/O
 * @returns Generated TypeScript file content as a string
 */
export async function generateSchemaFileContent(config: GenerateConfig): Promise<string> {
  const { maps, baseUrl = DEFAULT_REGISTRY_URL, timeout = 10000 } = config;

  console.log("Packaging schemas...\n");

  const processedMaps: Array<{ name: string; map: Map<string, SchemaContent> }> = [];

  for (const mapConfig of maps) {
    console.log(`Processing ${mapConfig.name}:`);
    const schemaMap = await processSchemas(mapConfig.schemas, baseUrl, timeout);
    processedMaps.push({ name: mapConfig.name, map: schemaMap });
    console.log();
  }

  return generateFileContent(processedMaps);
}

/**
 * Package schemas and write to file
 */
export async function packageSchemas(config: PackagerConfig): Promise<void> {
  const { outputPath, ...generateConfig } = config;

  const fileContent = await generateSchemaFileContent(generateConfig);

  const fs = await import("node:fs");
  const path = await import("node:path");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, fileContent, "utf-8");

  console.log(`✓ Schemas written to: ${outputPath}`);
}
