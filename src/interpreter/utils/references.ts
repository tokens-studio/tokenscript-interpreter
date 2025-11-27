import type { ReferenceRecord } from "@src/types";

export function parseReferences(jsonString: string): ReferenceRecord {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("References must be a JSON object");
    }
    return parsed as ReferenceRecord;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in references: ${error.message}`);
    }
    throw error;
  }
}
