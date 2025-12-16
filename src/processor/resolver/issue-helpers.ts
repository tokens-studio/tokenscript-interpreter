import type { ProcessorErrorCode } from "@interpreter/errors";
import type { IssuesMap } from "./types";

/**
 * Check if issues map contains an error with the specified code.
 * Useful for checking if any token has a specific type of error.
 *
 * @example
 * ```typescript
 * const result = resolver.updateToken({ ... });
 * if (hasIssueWithCode(result.issues, ProcessorErrorCode.CIRCULAR_DEPENDENCY)) {
 *   console.error("Circular dependency detected");
 * }
 * ```
 */
export function hasIssueWithCode(issues: IssuesMap | undefined, code: ProcessorErrorCode): boolean {
  if (!issues) return false;
  return Array.from(issues.entries()).some(([_tokenName, issueList]) =>
    issueList.some((issue) => "code" in issue && issue.code === code),
  );
}

/**
 * Check if a specific token has an issue with the specified code.
 *
 * @example
 * ```typescript
 * const result = resolver.updateToken({ tokenPath: "foo", ... });
 * if (tokenHasIssueWithCode(result.issues, "foo", ProcessorErrorCode.CIRCULAR_DEPENDENCY)) {
 *   console.error("Token 'foo' has a circular dependency");
 * }
 * ```
 */
export function tokenHasIssueWithCode(
  issues: IssuesMap | undefined,
  tokenName: string,
  code: ProcessorErrorCode,
): boolean {
  if (!issues) return false;
  const tokenIssues = issues.get(tokenName);
  if (!tokenIssues) return false;
  return tokenIssues.some((issue) => "code" in issue && issue.code === code);
}

/**
 * Get all tokens that have issues of any kind.
 *
 * @example
 * ```typescript
 * const result = resolver.build(tokens);
 * const tokensWithIssues = getTokensWithIssues(result.issues);
 * console.log(`${tokensWithIssues.size} tokens have issues`);
 * ```
 */
export function getTokensWithIssues(issues: IssuesMap | undefined): Set<string> {
  if (!issues) return new Set();
  return new Set(issues.keys());
}

/**
 * Check if there are any issues at all.
 *
 * @example
 * ```typescript
 * const result = resolver.build(tokens);
 * if (hasAnyIssues(result.issues)) {
 *   console.error("There are issues with the tokens");
 * }
 * ```
 */
export function hasAnyIssues(issues: IssuesMap | undefined): boolean {
  return issues !== undefined && issues.size > 0;
}
