import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import { isTokenscriptSymbol, symbolTypeToJsValue } from "@interpreter/symbols";
import { type ProcessorOutput, TokenResolver } from "../resolver/TokenResolver";
import { MapBuilder } from "./MapBuilder";
import type { OutputFormat, TokenBuilder } from "./types";

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

export interface BuildTokensOptions<T> {
  builder?: TokenBuilder<T>;
  config?: Config;
  output?: OutputFormat;
}

export function buildTokens<T = Map<string, InterpreterResult>>(
  tokens: Map<string, string>,
  options?: BuildTokensOptions<T>,
): ProcessorOutput & {
  tokens: Map<string, string | InterpreterResult>;
  output: T;
} {
  const { builder, config, output = "string" } = options ?? {};
  const finalBuilder = (builder ?? new MapBuilder(output)) as TokenBuilder<T>;

  const processor = new TokenResolver();
  const errors: Map<string, Error> = new Map();

  const callbacks = {
    onResolve: (tokenName: string, value: InterpreterResult) => {
      finalBuilder.onResolve(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      finalBuilder.onError(tokenName, error, originalValue);
      errors.set(tokenName, error);
    },
  };

  const result = processor.processTokens(tokens, callbacks, config);

  // For backward compatibility, tokens property points to builder result if it's a Map,
  // otherwise use the builder's output
  const tokensOutput =
    finalBuilder.getResult() instanceof Map
      ? (finalBuilder.getResult() as Map<string, string | InterpreterResult>)
      : (finalBuilder.getResult() as any);

  return {
    ...result,
    tokens: tokensOutput,
    output: finalBuilder.getResult(),
    errors,
  };
}
