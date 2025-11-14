import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import { isTokenscriptSymbol, symbolTypeToJsValue } from "@interpreter/symbols";
import { type ProcessorOutput, TokenResolver } from "../resolver/TokenResolver";
import type { TokenBuilder } from "./types";

export function serializeInterpreterResult(value: string | InterpreterResult): unknown {
  if (typeof value === "string") {
    return value;
  }
  if (value === null) {
    return null;
  }
  if (isTokenscriptSymbol(value)) {
    return symbolTypeToJsValue(value);
  }
  return value;
}

export function stringifyInterpreterResult(value: InterpreterResult): string {
  if (typeof value === "string") {
    return value;
  }
  if (isTokenscriptSymbol(value)) {
    return value.toString();
  }
  return String(value);
}

export function buildTokens<T>(
  tokens: Map<string, string>,
  builder: TokenBuilder<T>,
  config?: Config,
): ProcessorOutput & {
  tokens: Map<string, string | InterpreterResult>;
  output: T;
} {
  const processor = new TokenResolver();
  const errors: Map<string, Error> = new Map();

  const callbacks = {
    onResolve: (tokenName: string, value: InterpreterResult) => {
      builder.onResolve(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      builder.onError(tokenName, error, originalValue);
      errors.set(tokenName, error);
    },
  };

  const result = processor.processTokens(tokens, callbacks, config);

  // For backward compatibility, tokens property points to builder result if it's a Map,
  // otherwise use the builder's output
  const tokensOutput =
    builder.getResult() instanceof Map
      ? (builder.getResult() as Map<string, string | InterpreterResult>)
      : (builder.getResult() as any);

  return {
    ...result,
    tokens: tokensOutput,
    output: builder.getResult(),
    errors,
  };
}
