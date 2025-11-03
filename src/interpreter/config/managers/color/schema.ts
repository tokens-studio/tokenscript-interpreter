import { type } from "arktype";
import { isObject } from "@/src/interpreter/utils/type";

// Utility Schemas -------------------------------------------------------------

const ScriptBlockSchema = type({
  type: "string",
  script: "string",
});

// Schema ----------------------------------------------------------------------

const InitializerSchema = type({
  "title?": "string",
  keyword: "string",
  "description?": "string",
  // schema: type({ "...": "unknown" }),
  script: ScriptBlockSchema,
});

const ConversionSchema = type({
  source: "string",
  target: "string",
  "description?": "string",
  lossless: "boolean",
  script: ScriptBlockSchema,
});

export const validSchemaTypes = ["number", "string", "color"];

// Property type for spec schema
export interface SpecProperty {
  type: "number" | "string" | "color";
}

interface SpecSchemaType {
  type: "object";
  properties: Record<string, SpecProperty>;
  required?: string[];
  order?: string[];
  additionalProperties?: boolean;
}

// Main ------------------------------------------------------------------------

export interface ColorSpecification {
  name: string;
  type: "color";
  description?: string;
  schema?: SpecSchemaType;
  initializers: Array<{
    title?: string;
    keyword: string;
    description?: string;
    script: {
      type: string;
      script: string;
    };
  }>;
  conversions: Array<{
    source: string;
    target: string;
    description?: string;
    lossless: boolean;
    script: {
      type: string;
      script: string;
    };
  }>;
}

const _SpecPropertySchema = type({
  type: "'number' | 'string' | 'color'",
});

const SpecSchemaSchema = type({
  type: "'object'",
  properties: type("Record<string, unknown>").narrow((v): v is Record<string, SpecProperty> => {
    if (!isObject(v)) return false;
    return Object.values(v).every((prop) =>
      ["number", "string", "color"].includes((prop as any)?.type),
    );
  }),
  "required?": "string[]",
  "order?": "string[]",
  "additionalProperties?": "boolean",
});

export const ColorSpecificationSchema = type({
  name: "string",
  type: "'color'",
  "description?": "string",
  "schema?": SpecSchemaSchema,
  initializers: InitializerSchema.array(),
  conversions: ConversionSchema.array(),
});

export const specName = (spec: ColorSpecification): string => spec.name.toLowerCase();

// Minimal viable ColorSpecification for testing and defaults
export const MINIMAL_COLOR_SPECIFICATION: ColorSpecification = {
  name: "MinimalColor",
  type: "color" as const,
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
