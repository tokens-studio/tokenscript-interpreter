import { ColorSpecificationSchema } from "@interpreter/config/managers/color/schema";
import { z } from "zod";

const TokenScriptSchemaResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  schema: z.string().url(),
  slug: z.string(),
  version: z.string(),
  content: ColorSpecificationSchema,
  license_name: z.string(),
});

export type TokenScriptSchemaResponse = z.infer<typeof TokenScriptSchemaResponseSchema>;
export type TokenScriptSchemaContent = z.infer<typeof ColorSpecificationSchema>;

export interface SchemaFetcherOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export async function fetchTokenScriptSchema(
  schemaUri: string,
  options: SchemaFetcherOptions = {},
): Promise<TokenScriptSchemaResponse> {
  const { timeout = 10000, headers = {} } = options;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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

    // Validate the response structure using Zod
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
