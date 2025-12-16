import { isLanguageError } from "@interpreter/errors";
import { ProcessorErrorCode } from "@interpreter/errors/codes/processor";
import type { RefPath, TokenOperationResult } from "./types";

/**
 * Get all affected token paths from the dependants graph.
 * Returns the set of all tokens that depend on the changed token.
 */
export function getAffectedTokens(result: TokenOperationResult): Set<RefPath> {
  if (!result.dependants?.graph) {
    return new Set();
  }
  return new Set(result.dependants.graph.getNodes().keys());
}

/**
 * Get broken references from issues.
 * Filters issues for TOKEN_NOT_FOUND or DEPENDENCY_ERROR codes.
 */
export function getBrokenReferences(result: TokenOperationResult): Set<RefPath> {
  if (!result.issues) {
    return new Set();
  }

  const brokenRefs = new Set<RefPath>();

  for (const [tokenPath, issues] of result.issues) {
    for (const issue of issues) {
      // Check for ProcessorError with TOKEN_NOT_FOUND or DEPENDENCY_ERROR code
      if (
        isLanguageError(issue) &&
        (issue.code === ProcessorErrorCode.TOKEN_NOT_FOUND ||
          issue.code === ProcessorErrorCode.DEPENDENCY_ERROR)
      ) {
        brokenRefs.add(tokenPath);
        break;
      }
    }
  }

  return brokenRefs;
}

/**
 * For rename operations: get tokens whose references were updated.
 * Pass the set of tokens that were modified during rename.
 */
export function getRenamedReferences(
  _result: TokenOperationResult,
  modifiedTokens: Set<RefPath>,
): Set<RefPath> {
  return modifiedTokens;
}

/**
 * Get tokens from the dependants graph whose values actually changed.
 * Compares the old token values with the new result to filter only modified tokens.
 */
export function getModifiedDependants(
  oldTokens: Map<RefPath, any>,
  result: TokenOperationResult,
): Set<RefPath> {
  const modified = new Set<RefPath>();

  // Get all dependants from the graph
  const affectedTokens = getAffectedTokens(result);

  // Filter to only those whose values actually changed
  for (const tokenPath of affectedTokens) {
    const oldValue = oldTokens.get(tokenPath);
    const newValue = result.tokens.get(tokenPath);

    // Compare values - if they differ, the token was modified
    if (oldValue !== newValue) {
      modified.add(tokenPath);
    }
  }

  return modified;
}
