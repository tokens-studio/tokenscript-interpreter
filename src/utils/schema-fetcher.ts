import { ColorSpecificationSchema } from "@interpreter/config/managers/color/schema";
import { FunctionSpecificationSchema } from "@interpreter/config/managers/functions/schema";
import { z } from "zod";

const SchemaContentSchema = z.discriminatedUnion("type", [
  ColorSpecificationSchema,
  FunctionSpecificationSchema,
]);

const TokenScriptSchemaResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  schema: z.string(),
  slug: z.string(),
  version: z.string(),
  content: SchemaContentSchema,
  license_name: z.string().nullish(),
});

export type TokenScriptSchemaResponse = z.infer<typeof TokenScriptSchemaResponseSchema>;
export type TokenScriptSchemaContent = z.infer<typeof SchemaContentSchema>;

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

    const validatedData = TokenScriptSchemaResponseSchema.parse(data);

    return validatedData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof z.ZodError) {
      throw new Error(`Invalid schema structure: ${error.message}`);
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
