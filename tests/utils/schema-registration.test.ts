import { Config } from "@interpreter/config";
import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import type { TokenScriptSchemaResponse } from "@src/utils/schema-fetcher";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the fetch function
global.fetch = vi.fn();

describe("fetchAndRegisterSchemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a color schema", async () => {
    const mockColorSchemaResponse: TokenScriptSchemaResponse = {
      id: "test-color-123",
      type: "color",
      schema: "https://schema.example.com/colors/test/1/",
      slug: "test-color",
      version: "1.0.0",
      content: {
        name: "TestColor",
        type: "color",
        description: "A test color schema",
        schema: {
          type: "object",
          properties: {
            value: {
              type: "string",
            },
          },
        },
        initializers: [],
        conversions: [],
      },
      license_name: "MIT",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockColorSchemaResponse,
    });

    const config = await fetchAndRegisterSchemas([
      "https://schema.example.com/colors/test/1/",
    ]);

    expect(config).toBeInstanceOf(Config);
    expect(config.colorManager.getSpecByType("testcolor")).toBeDefined();
  });

  it("should register a function schema", async () => {
    const mockFunctionSchemaResponse: TokenScriptSchemaResponse = {
      id: "test-func-456",
      type: "function",
      schema: "https://schema.example.com/functions/test/1/",
      slug: "test-func",
      version: "1.0.0",
      content: {
        name: "Test Function",
        type: "function",
        keyword: "test_func",
        description: "A test function",
        script: {
          type: "https://schema.tokenscript.dev/api/v1/core/tokenscript/0/function",
          script: "return 42;",
        },
      },
      license_name: "MIT",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFunctionSchemaResponse,
    });

    const config = await fetchAndRegisterSchemas([
      "https://schema.example.com/functions/test/1/",
    ]);

    expect(config).toBeInstanceOf(Config);
    expect(config.functionsManager.hasFunction("test_func")).toBe(true);
  });

  it("should register multiple schemas", async () => {
    const mockColorSchemaResponse: TokenScriptSchemaResponse = {
      id: "test-color-123",
      type: "color",
      schema: "https://schema.example.com/colors/test/1/",
      slug: "test-color",
      version: "1.0.0",
      content: {
        name: "TestColor",
        type: "color",
        schema: {
          type: "object",
          properties: {
            value: {
              type: "string",
            },
          },
        },
        initializers: [],
        conversions: [],
      },
      license_name: "MIT",
    };

    const mockFunctionSchemaResponse: TokenScriptSchemaResponse = {
      id: "test-func-456",
      type: "function",
      schema: "https://schema.example.com/functions/test/1/",
      slug: "test-func",
      version: "1.0.0",
      content: {
        name: "Test Function",
        type: "function",
        keyword: "test_func",
        script: {
          type: "https://schema.tokenscript.dev/api/v1/core/tokenscript/0/function",
          script: "return 42;",
        },
      },
      license_name: "MIT",
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockColorSchemaResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFunctionSchemaResponse,
      });

    const config = await fetchAndRegisterSchemas([
      "https://schema.example.com/colors/test/1/",
      "https://schema.example.com/functions/test/1/",
    ]);

    expect(config).toBeInstanceOf(Config);
    expect(config.colorManager.getSpecByType("testcolor")).toBeDefined();
    expect(config.functionsManager.hasFunction("test_func")).toBe(true);
  });

  it("should return config as-is if no schemas provided", async () => {
    const config = await fetchAndRegisterSchemas([]);
    expect(config).toBeInstanceOf(Config);
  });

  it("should use existing config if provided", async () => {
    const existingConfig = new Config();
    const mockColorSchemaResponse: TokenScriptSchemaResponse = {
      id: "test-color-123",
      type: "color",
      schema: "https://schema.example.com/colors/test/1/",
      slug: "test-color",
      version: "1.0.0",
      content: {
        name: "TestColor",
        type: "color",
        schema: {
          type: "object",
          properties: {
            value: {
              type: "string",
            },
          },
        },
        initializers: [],
        conversions: [],
      },
      license_name: "MIT",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockColorSchemaResponse,
    });

    const config = await fetchAndRegisterSchemas(
      ["https://schema.example.com/colors/test/1/"],
      existingConfig,
    );

    expect(config).toBe(existingConfig);
    expect(config.colorManager.getSpecByType("testcolor")).toBeDefined();
  });
});
