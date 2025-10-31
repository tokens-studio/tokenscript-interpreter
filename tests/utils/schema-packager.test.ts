import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateSchemaFileContent } from "@src/utils/schema-packager";
import type { ColorSpecification } from "@interpreter/config/managers/color/schema";
import type { FunctionSpecification } from "@interpreter/config/managers/functions/schema";
import { fetchTokenScriptSchema } from "@src/utils/schema-fetcher";

vi.mock("@src/utils/schema-fetcher");

const mockColorSchema: ColorSpecification = {
  name: "RGB",
  type: "color",
  description: "RGB color space",
  schema: {
    type: "object",
    properties: {
      r: { type: "number" },
      g: { type: "number" },
      b: { type: "number" },
    },
    required: ["r", "g", "b"],
    additionalProperties: false,
  },
  initializers: [
    {
      keyword: "rgb",
      script: {
        type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
        script: "return {input};",
      },
    },
  ],
  conversions: [],
};

const mockFunctionSchema: FunctionSpecification = {
  name: "Darken",
  type: "function",
  keyword: "darken",
  description: "Darkens a color",
  script: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: "return darken({input});",
  },
  requirements: [],
};

describe("Schema Packager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(fetchTokenScriptSchema).mockResolvedValue({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "0.0.1",
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and generate content with remote schemas", async () => {
    vi.mocked(fetchTokenScriptSchema).mockResolvedValueOnce({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "0.0.1",
    } as any);

    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color" }],
        },
      ],
    });

    expect(fetchTokenScriptSchema).toHaveBeenCalledWith(
      expect.stringContaining("rgb-color/latest"),
      expect.objectContaining({ timeout: 10000 })
    );

    expect(result).toContain("export const COLOR_SCHEMAS");
    expect(result).toContain("// Auto-generated file - DO NOT EDIT");
    expect(result).toContain('"name":"RGB"');
  });

  it("should use custom version when specified", async () => {
    vi.mocked(fetchTokenScriptSchema).mockResolvedValueOnce({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "1.0.0",
    } as any);

    await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color", version: "1.0.0" }],
        },
      ],
    });

    expect(fetchTokenScriptSchema).toHaveBeenCalledWith(
      expect.stringContaining("rgb-color/1.0.0"),
      expect.any(Object)
    );
  });

  it("should generate content with hardcoded schemas", async () => {
    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "FUNCTION_SCHEMAS",
          schemas: [
            {
              url: "https://example.com/darken/0/",
              content: mockFunctionSchema,
            },
          ],
        },
      ],
    });

    expect(fetchTokenScriptSchema).not.toHaveBeenCalled();
    expect(result).toContain("export const FUNCTION_SCHEMAS");
    expect(result).toContain("https://example.com/darken/0/");
    expect(result).toContain('"name":"Darken"');
  });

  it("should handle multiple schema maps", async () => {
    vi.mocked(fetchTokenScriptSchema)
      .mockResolvedValueOnce({
        content: mockColorSchema,
        slug: "rgb-color",
        version: "0.0.1",
      } as any)
      .mockResolvedValueOnce({
        content: mockFunctionSchema,
        slug: "darken",
        version: "1.0.0",
      } as any);

    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color" }],
        },
        {
          name: "FUNCTION_SCHEMAS",
          schemas: [{ name: "darken" }],
        },
      ],
    });

    expect(result).toContain("export const COLOR_SCHEMAS");
    expect(result).toContain("export const FUNCTION_SCHEMAS");
  });

  it("should use custom base URL when specified", async () => {
    vi.mocked(fetchTokenScriptSchema).mockResolvedValueOnce({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "0.0.1",
    } as any);

    const customBaseUrl = "https://custom.example.com/api/schemas";

    await generateSchemaFileContent({
      baseUrl: customBaseUrl,
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color" }],
        },
      ],
    });

    expect(fetchTokenScriptSchema).toHaveBeenCalledWith(
      expect.stringContaining("custom.example.com"),
      expect.any(Object)
    );
  });

  it("should use per-schema base URL when specified", async () => {
    vi.mocked(fetchTokenScriptSchema).mockResolvedValueOnce({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "0.0.1",
    } as any);

    const schemaBaseUrl = "https://schema-specific.example.com";

    await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color", baseUrl: schemaBaseUrl }],
        },
      ],
    });

    expect(fetchTokenScriptSchema).toHaveBeenCalledWith(
      expect.stringContaining("schema-specific.example.com"),
      expect.any(Object)
    );
  });

  it("should use custom timeout when specified", async () => {
    vi.mocked(fetchTokenScriptSchema).mockResolvedValueOnce({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "0.0.1",
    } as any);

    await generateSchemaFileContent({
      timeout: 5000,
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color" }],
        },
      ],
    });

    expect(fetchTokenScriptSchema).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 5000 })
    );
  });

  it("should handle fetch errors gracefully", async () => {
    vi.mocked(fetchTokenScriptSchema).mockRejectedValueOnce(new Error("Network error"));

    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [{ name: "rgb-color" }],
        },
      ],
    });

    // Should still generate valid output even with failed fetches
    expect(result).toContain("export const COLOR_SCHEMAS");
  });

  it("should generate valid TypeScript with timestamp", async () => {
    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [
            {
              url: "https://example.com/rgb/0/",
              content: mockColorSchema,
            },
          ],
        },
      ],
    });

    expect(result).toContain("// Auto-generated file - DO NOT EDIT");
    expect(result).toContain("// Generated at:");
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
  });

  it("should mix hardcoded and fetched schemas", async () => {
    vi.mocked(fetchTokenScriptSchema).mockResolvedValueOnce({
      content: mockColorSchema,
      slug: "rgb-color",
      version: "0.0.1",
    } as any);

    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [
            { name: "rgb-color" },
            {
              url: "https://example.com/hardcoded/0/",
              content: mockColorSchema,
            },
          ],
        },
      ],
    });

    expect(fetchTokenScriptSchema).toHaveBeenCalledTimes(1);
    expect(result).toContain("rgb-color");
    expect(result).toContain("https://example.com/hardcoded/0/");
  });

  it("should generate Map with proper structure", async () => {
    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "TEST_SCHEMAS",
          schemas: [
            {
              url: "https://example.com/test/0/",
              content: mockColorSchema,
            },
          ],
        },
      ],
    });

    expect(result).toContain("export const TEST_SCHEMAS = new Map<string, any>([");
    expect(result).toContain("['https://example.com/test/0/', {");
    expect(result).toContain("]);");
  });

  it("should preserve schema structure in generated output", async () => {
    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "COLOR_SCHEMAS",
          schemas: [
            {
              url: "https://example.com/rgb/0/",
              content: mockColorSchema,
            },
          ],
        },
      ],
    });

    expect(result).toContain('"type":"color"');
    expect(result).toContain('"keyword":"rgb"');
    expect(result).toContain('"description":"RGB color space"');
  });

  it("should handle empty schema lists", async () => {
    const result = await generateSchemaFileContent({
      maps: [
        {
          name: "EMPTY_SCHEMAS",
          schemas: [],
        },
      ],
    });

    expect(result).toContain("export const EMPTY_SCHEMAS = new Map<string, any>([");
    expect(result).toContain("]);");
  });
});
