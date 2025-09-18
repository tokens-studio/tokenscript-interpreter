import { z } from "zod";

// Script Block Schema
const ScriptBlockSchema = z.object({
  type: z.string().optional(),
  script: z.string(),
});

export type ScriptBlock = z.infer<typeof ScriptBlockSchema>;

// Conversion Schema
const ConversionSchema = z.object({
  source: z.string(),
  target: z.string(),
  script: ScriptBlockSchema,
  description: z.string().optional(),
});

export type Conversion = z.infer<typeof ConversionSchema>;

// Unit Specification Schema
export const UnitSpecificationSchema = z.object({
  name: z.string(),
  type: z.enum(["absolute", "relative"]),
  keyword: z.string(),
  description: z.string().optional(),
  conversions: z.array(ConversionSchema).optional().default([]),
  to_absolute: ScriptBlockSchema.optional(),
});

export type UnitSpecification = z.infer<typeof UnitSpecificationSchema>;

export const specName = (spec: UnitSpecification): string => spec.name.toLowerCase();

export const validUnitTypes = ["absolute", "relative"] as const;
