import type { TokenData } from "@src/processor/utils/tokens";

export function toTokenData(tokens: Map<string, string>): Map<string, TokenData> {
  const result = new Map<string, TokenData>();
  for (const [key, value] of tokens) {
    result.set(key, { $value: value });
  }
  return result;
}
