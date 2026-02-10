import { type } from "arktype";

export interface ConstantsSpecification {
  name: string;
  type: "constants";
  description?: string;
  inline: boolean;
  values: Record<string, string | number | boolean>;
}

export const ConstantsSpecificationSchema = type({
  name: "string",
  type: "'constants'",
  "description?": "string",
  inline: "boolean",
  values: "Record<string, string | number | boolean>",
});
