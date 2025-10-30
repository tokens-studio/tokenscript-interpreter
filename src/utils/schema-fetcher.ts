import { Config } from "@interpreter/config";
import {
  type ColorSpecification,
  ColorSpecificationSchema,
} from "@interpreter/config/managers/color/schema";
import {
  type FunctionSpecification,
  FunctionSpecificationSchema,
} from "@interpreter/config/managers/functions/schema";
import { type } from "arktype";

const SchemaContentSchema = ColorSpecificationSchema.or(FunctionSpecificationSchema);

const TokenScriptSchemaResponseSchema = type({
  id: "string",
  type: "string",
  schema: "string",
  slug: "string",
  version: "string",
  content: SchemaContentSchema,
  "license_name?": "string | null",
});

export type TokenScriptSchemaResponse = typeof TokenScriptSchemaResponseSchema.infer;
export type TokenScriptSchemaContent = ColorSpecification | FunctionSpecification;

export interface SchemaFetcherOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function fetchTokenScriptSchema(
  schemaUri: string,
  options: SchemaFetcherOptions = {},
): Promise<TokenScriptSchemaResponse> {
  const { timeout = 10000, headers = {}, signal } = options;

  const controller = signal ? new AbortController() : new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(schemaUri, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TokenScript-Interpreter/1.0",
        ...headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    const validatedData = TokenScriptSchemaResponseSchema(data);

    if (validatedData instanceof type.errors) {
      throw new Error(`Invalid schema structure: ${validatedData.summary}`);
    }

    return validatedData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof type.errors) {
      throw new Error(`Invalid schema structure: ${error.summary}`);
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`Schema fetch timeout after ${timeout}ms`);
      }
      throw new Error(`Failed to fetch schema: ${error.message}`);
    }

    throw new Error("Unknown error occurred while fetching schema");
  }
}

export async function fetchAndRegisterSchemas(
  schemaUris: string[],
  config?: Config,
): Promise<Config> {
  const configInstance = config || new Config();

  if (!schemaUris || schemaUris.length === 0) {
    return configInstance;
  }

  const schemas = await Promise.all(
    schemaUris.map(async (uri) => {
      const schemaResponse = await fetchTokenScriptSchema(uri);
      return {
        uri,
        schema: schemaResponse.content as ColorSpecification | FunctionSpecification,
      };
    }),
  );

  return configInstance.registerSchemas(schemas);
}
