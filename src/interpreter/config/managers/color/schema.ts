import { z } from "zod";

// Utility Schemas -------------------------------------------------------------

const ScriptBlockSchema = z.object({
  type: z.string().url(),
  script: z.string(),
});

// Schema ----------------------------------------------------------------------

const InitializerSchema = z.object({
  title: z.string().optional(),
  keyword: z.string(),
  description: z.string().optional(),
  // schema: z.record(z.any()),
  script: ScriptBlockSchema,
});

const ConversionSchema = z.object({
  source: z.string(),
  target: z.string(),
  description: z.string().optional(),
  lossless: z.boolean(),
  script: ScriptBlockSchema,
});

export const validSchemaTypes = ["number", "string", "color"];

const SpecSchemaSchema = z.object({
  type: z.literal("object"),
  properties: z.record(
    z.string(),
    z.object({
      type: z.enum(validSchemaTypes),
    }),
  ),
  required: z.array(z.string()).optional(),
  order: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
});

// Main ------------------------------------------------------------------------

export const ColorSpecificationSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  schema: SpecSchemaSchema.optional(),
  initializers: z.array(InitializerSchema).default([]),
  conversions: z.array(ConversionSchema).default([]),
});

export type ColorSpecification = z.infer<typeof ColorSpecificationSchema>;

export const specName = (spec: ColorSpecification): string => spec.name.toLowerCase();

// Minimal viable ColorSpecification for testing and defaults
export const MINIMAL_COLOR_SPECIFICATION: ColorSpecification = {
  name: "MinimalColor",
  type: "color",
  schema: {
    type: "object",
    properties: {
      value: {
        type: "string",
      },
    },
  },
  initializers: [
    {
      keyword: "minimal",
      script: {
        type: "https://schema.example.com/tokenscript/0/",
        script: "return {input};",
      },
    },
  ],
  conversions: [],
};
