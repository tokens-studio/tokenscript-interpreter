import type { LintIssue } from "../../types";
import type { ValidatorCode } from "../codes";
import type { ValidatorContext } from "../types";

/**
 * Creates a LintIssue from validation context.
 *
 * @param ctx - The validation context
 * @param code - The error code from ValidatorCode enum
 * @param message - Human-readable error message
 * @param data - Optional additional data for debugging
 */
export function issue(
  ctx: ValidatorContext,
  code: ValidatorCode,
  message: string,
  data?: Record<string, unknown>,
): LintIssue {
  return {
    code,
    severity: ctx.severity,
    message,
    tokenName: ctx.tokenName,
    path: ctx.path.length > 0 ? [...ctx.path] : undefined,
    data,
  };
}
