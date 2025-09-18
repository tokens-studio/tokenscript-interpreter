import { z } from "zod";

// Utility Schemas -------------------------------------------------------------

const ScriptBlockSchema = z.object({
  type: z.string().url(),
  script: z.string(),
});

// Schema ----------------------------------------------------------------------

const InitializerSchema = z.object({
  title: z.string(),
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

export const validSchemaTypes = ["number", "string"];

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
  schema: SpecSchemaSchema,
  initializers: z.array(InitializerSchema),
  conversions: z.array(ConversionSchema),
});

export type ColorSpecification = z.infer<typeof ColorSpecificationSchema>;

export const specName = (spec: ColorSpecification): string => spec.name.toLowerCase();
