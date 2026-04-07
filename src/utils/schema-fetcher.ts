import { Config } from "@interpreter/config";
import { type ColorSpecification, parseColorSpec } from "@interpreter/config/managers/color/schema";
import {
  type FunctionSpecification,
  parseFunctionSpec,
} from "@interpreter/config/managers/functions/schema";
import { ZodError } from "@tokens-studio/schema-validation";

// The TokenScript schema-server response envelope. The inner `content`
// is the actual schema specification (color or function); everything else
// is registry metadata.
//
// Validated by hand here rather than via the schema-validation library
// because the envelope is registry-server specific and not part of the
// schema language itself. The library handles the inner `content` field.
export interface TokenScriptSchemaResponse {
  id: string;
  type: string;
  schema: string;
  slug: string;
  version: string;
  content: TokenScriptSchemaContent;
  license_name?: string | null;
}

export type TokenScriptSchemaContent = ColorSpecification | FunctionSpecification;

export interface SchemaFetcherOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function summarizeZodError(err: ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
}

/**
 * Validate a parsed JSON value as a TokenScriptSchemaResponse envelope
 * and parse the inner `content` as a color or function specification.
 *
 * Throws an `Error` describing the first violation on failure.
 */
function parseTokenScriptSchemaResponse(data: unknown): TokenScriptSchemaResponse {
  if (!isPlainObject(data)) {
    throw new Error("Invalid schema structure: expected an object");
  }

  const requireString = (key: string): string => {
    const value = data[key];
    if (typeof value !== "string") {
      throw new Error(`Invalid schema structure: missing or non-string field "${key}"`);
    }
    return value;
  };

  const id = requireString("id");
  const type = requireString("type");
  const schema = requireString("schema");
  const slug = requireString("slug");
  const version = requireString("version");

  if (!("content" in data)) {
    throw new Error('Invalid schema structure: missing field "content"');
  }
  const rawContent = data.content;
  if (!isPlainObject(rawContent)) {
    throw new Error('Invalid schema structure: "content" must be an object');
  }

  const contentType = rawContent.type;
  let content: TokenScriptSchemaContent;
  try {
    if (contentType === "color") {
      content = parseColorSpec(rawContent);
    } else if (contentType === "function") {
      content = parseFunctionSpec(rawContent);
    } else {
      throw new Error(
        `Unsupported content.type "${String(contentType)}" — expected "color" or "function"`,
      );
    }
  } catch (err) {
    const detail =
      err instanceof ZodError
        ? summarizeZodError(err)
        : err instanceof Error
          ? err.message
          : String(err);
    throw new Error(`Invalid schema structure: content: ${detail}`);
  }

  let license_name: string | null | undefined;
  if ("license_name" in data) {
    const raw = data.license_name;
    if (raw !== null && raw !== undefined && typeof raw !== "string") {
      throw new Error('Invalid schema structure: "license_name" must be a string or null');
    }
    license_name = raw as string | null | undefined;
  }

  return { id, type, schema, slug, version, content, license_name };
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
    return parseTokenScriptSchemaResponse(data);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`Schema fetch timeout after ${timeout}ms`);
      }
      // Validation errors are already wrapped with "Invalid schema structure".
      if (
        error.message.startsWith("Invalid schema structure") ||
        error.message.startsWith("HTTP error")
      ) {
        throw error;
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
