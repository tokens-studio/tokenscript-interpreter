import { type } from "arktype";

export const FunctionSpecificationSchema = type({
  name: "string",
  type: "'function'",
  "input?": {
    type: "'object'",
    "properties?": "Record<string, unknown>",
  },
  script: {
    type: "string",
    script: "string",
  },
  keyword: "string",
  "description?": "string",
  "requirements?": "string[]",
});

export interface FunctionSpecification {
  name: string;
  type: "function";
  input?: {
    type: "object";
    properties?: Record<string, unknown>;
  };
  script: {
    type: string;
    script: string;
  };
  keyword: string;
  description?: string;
  requirements?: string[];
}
