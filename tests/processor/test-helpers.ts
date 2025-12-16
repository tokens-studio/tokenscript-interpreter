import type { TokenData } from "@src/processor/utils/tokens";

export function toTokenData(tokens: Map<string, string>): Map<string, TokenData> {
  const result = new Map<string, TokenData>();
  for (const [key, value] of tokens) {
    result.set(key, { $value: value });
  }
  return result;
}

// Re-export issue helpers from source for convenience
export { hasIssueWithCode, tokenHasIssueWithCode } from "@src/processor/resolver/issue-helpers";
