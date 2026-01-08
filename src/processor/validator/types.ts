import type { RefPath } from "../resolver/types";

export enum ValidationSeverity {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * A validation issue found during token type validation.
 *
 * @property code - Unique error code for this specific issue type
 * @property severity - Severity level (ERROR, WARNING, INFO)
 * @property message - Human-readable description of the issue
 * @property tokenName - The token where the issue was found
 * @property path - Path to the specific field within a structured token (e.g., ["fontSize"] or [0, "blur"] for arrays)
 * @property line - Optional line number in the source
 * @property data - Additional structured data for debugging
 */
export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  tokenName: RefPath;
  path?: (string | number)[];
  line?: number;
  data?: Record<string, unknown>;
}
