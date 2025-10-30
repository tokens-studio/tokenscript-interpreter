import { type } from "arktype";

// Script Block Schema
const ScriptBlockSchema = type({
  "type?": "string",
  script: "string",
});

export interface ScriptBlock {
  type?: string;
  script: string;
}

// Conversion Schema
const ConversionSchema = type({
  source: "string",
  target: "string",
  script: ScriptBlockSchema,
  "description?": "string",
});

export interface Conversion {
  source: string;
  target: string;
  script: ScriptBlock;
  description?: string;
}

// Unit Specification Schema
export const UnitSpecificationSchema = type({
  name: "string",
  type: "'absolute' | 'relative'",
  keyword: "string",
  "description?": "string",
  "conversions?": ConversionSchema.array(),
  "to_absolute?": ScriptBlockSchema,
});

export interface UnitSpecification {
  name: string;
  type: "absolute" | "relative";
  keyword: string;
  description?: string;
  conversions?: Conversion[];
  to_absolute?: ScriptBlock;
}

export const specName = (spec: UnitSpecification): string => spec.name.toLowerCase();

export const validUnitTypes = ["absolute", "relative"] as const;
