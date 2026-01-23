import { type } from "arktype";

// Schema ----------------------------------------------------------------------

export const validSchemaTypes = ["number", "string", "token", "object", "list"];

// Property type for spec schema
export interface SpecProperty {
  type: "number" | "string" | "token" | "object" | "list";
  url?: string; // For token references
  properties?: Record<string, SpecProperty>; // For nested objects
  validations?: Record<string, string>; // Validation scripts
  items?: SpecItemsType; // For list types - defines the schema for each item
}

// Items schema for list types
export interface SpecItemsType {
  type: "object" | "token";
  url?: string; // For token references (when type is "token")
  properties?: Record<string, SpecProperty>; // For object items
}

interface SpecSchemaType {
  type: "object" | "number" | "string" | "list";
  properties?: Record<string, SpecProperty>;
  validations?: Record<string, string>;
  required?: string[];
  order?: string[];
  additionalProperties?: boolean;
  items?: SpecItemsType; // For list types
}

// Main ------------------------------------------------------------------------

export interface TokenSpecification {
  name: string;
  type: "token";
  description?: string;
  url?: string;
  schema?: SpecSchemaType;
  /** TokenScript validation script. Receives {input} and should return true or error string. Can be a string (direct script) or object with type and script (built schema). */
  validation?: string | { type: string; script: string };
}

// Arktype schemas for validation

const SpecSchemaSchema = type({
  type: "'object' | 'number' | 'string' | 'list'",
  "properties?": "Record<string, unknown>", // Simplified validation
  "validations?": "Record<string, string>",
  "required?": "string[]",
  "order?": "string[]",
  "additionalProperties?": "boolean",
  "items?": "unknown", // For list types - validated at runtime
});

export const TokenSpecificationSchema = type({
  name: "string",
  type: "'token'",
  "description?": "string",
  "url?": "string",
  "schema?": SpecSchemaSchema,
  "validation?": "string | unknown", // Allow string or object, validated at runtime in manager
});

export const specName = (spec: TokenSpecification): string => spec.name.toLowerCase();
