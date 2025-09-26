import { describe, expect, it, vi } from "vitest";
import type { SchemaFetcherOptions } from "@src/utils/schema-fetcher";
import {
  fetchTokenScriptSchema,
} from "@src/utils/schema-fetcher";

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample response data that matches the fetched schema structure
const mockSchemaResponse = {
  id: "9b629e61-39a8-4c65-b169-eb30395a7dd2",
  type: "type",
  schema: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgba-color/?format=json",
  slug: "rgba-color",
  version: "0.0.1",
  content: {
    name: "RGBA",
    type: "color",
    schema: {
      type: "object",
      order: ["r", "g", "b", "a"],
      required: ["r", "g", "b", "a"],
      properties: {
        a: { type: "number" },
        b: { type: "number" },
        g: { type: "number" },
        r: { type: "number" },
      },
      additionalProperties: false,
    },
    conversions: [
      {
        script: {
          type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
          script: "return {input};",
        },
        source: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/",
        target: "$self",
        lossless: true,
        description: "Converts HEX to RGBA",
      },
    ],
    description: "RGBA color with alpha transparency",
    initializers: [
      {
        keyword: "rgba",
        script: {
          type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
          script: "return {input};",
        },
        description: "Creates a RGBA color from string",
      },
    ],
  },
  license_name: "MPL",
};

describe("Schema Fetcher", () => {

  describe("fetchTokenScriptSchema", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should successfully fetch and validate schema", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchemaResponse),
      });

      const result = await fetchTokenScriptSchema("https://example.com/schema");
      
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/schema", {
        signal: expect.any(AbortSignal),
        headers: {
          "Accept": "application/json",
          "User-Agent": "TokenScript-Interpreter/1.0",
        },
      });
      
      expect(result).toEqual(mockSchemaResponse);
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(fetchTokenScriptSchema("https://example.com/schema"))
        .rejects.toThrow("HTTP error! status: 404 - Not Found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchTokenScriptSchema("https://example.com/schema"))
        .rejects.toThrow("Failed to fetch schema: Network error");
    });

    it("should handle timeout", async () => {
      const options: SchemaFetcherOptions = { timeout: 100 };
      
      // Mock a slow response that gets aborted
      mockFetch.mockImplementationOnce((url, opts) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve(mockSchemaResponse),
            });
          }, 200);
          
          if (opts?.signal) {
            opts.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });

      await expect(fetchTokenScriptSchema("https://example.com/schema", options))
        .rejects.toThrow("Schema fetch timeout after 100ms");
    });

    it("should handle invalid schema structure", async () => {
      const invalidResponse = { invalid: "structure" };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse),
      });

      await expect(fetchTokenScriptSchema("https://example.com/schema"))
        .rejects.toThrow("Invalid schema structure:");
    });

    it("should pass custom headers", async () => {
      const customHeaders = { "Authorization": "Bearer token123" };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchemaResponse),
      });

      await fetchTokenScriptSchema("https://example.com/schema", { headers: customHeaders });
      
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/schema", {
        signal: expect.any(AbortSignal),
        headers: {
          "Accept": "application/json",
          "User-Agent": "TokenScript-Interpreter/1.0",
          "Authorization": "Bearer token123",
        },
      });
    });
  });

});
