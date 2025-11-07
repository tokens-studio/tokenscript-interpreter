import type { Config } from "@interpreter/config";
import { flattenTokens, hasNestedStructure } from "@src/utils/tokens-json-adapter";
import type { interpreterResult } from "../interpreter/interpreter";
import { type ProcessorOutput, TokenProcessor } from "./TokenProcessor";

function normalizeTokenInput(tokenInput: Record<string, any>): Record<string, string> {
  if (hasNestedStructure(tokenInput)) {
    return flattenTokens(tokenInput);
  }

  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokenInput)) {
    flat[key] = String(value);
  }
  return flat;
}

function buildTokens(
  tokens: Map<string, string>,
  config?: Config,
): ProcessorOutput & { tokens: Map<string, interpreterResult> } {
  const processor = new TokenProcessor();
  const output: Map<string, interpreterResult> = new Map();
  const errors: Map<string, Error> = new Map();

  const callbacks = {
    onResolve: (tokenName: string, value: interpreterResult) => {
      output.set(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      output.set(tokenName, originalValue);
      errors.set(tokenName, error);
    },
  };

  const result = processor.processTokens(tokens, callbacks, config);

  return {
    ...result,
    tokens: output,
    errors,
  };
}

export function interpretTokens(
  tokenInput: Map<string, string> | Record<string, any>,
  config?: Config,
): ProcessorOutput & { tokens: Map<string, interpreterResult> } {
  const tokens =
    tokenInput instanceof Map
      ? tokenInput
      : new Map(Object.entries(normalizeTokenInput(tokenInput)));

  return buildTokens(tokens, config);
}
