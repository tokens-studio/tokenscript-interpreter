import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import { isTokenscriptSymbol, symbolTypeToJsValue } from "@interpreter/symbols";
import { type ProcessorOutput, TokenResolver } from "../resolver/TokenResolver";
import type { TokenData } from "../utils/tokens";
import { MapBuilder } from "./MapBuilder";
import type { OutputFormat, TokenBuilder } from "./types";

export function serializeInterpreterResult(value: InterpreterResult): unknown {
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
  tokens: Map<string, string | TokenData>,
  options?: BuildTokensOptions<T>,
): ProcessorOutput & {
  output: T;
} {
  const { config, output = "string", builder = new MapBuilder(output) } = options ?? {};

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
  let tokensOutput =
    builder.getResult() instanceof Map
      ? (builder.getResult() as Map<string, string | InterpreterResult>)
      : (builder.getResult() as T);

  // Filter out sub-field paths from output
  if (result.subFieldPaths && result.subFieldPaths.size > 0 && tokensOutput instanceof Map) {
    tokensOutput = new Map(tokensOutput);
    for (const subFieldPath of result.subFieldPaths) {
      tokensOutput.delete(subFieldPath);
      errors.delete(subFieldPath);
    }
  }

  return {
    ...result,
    tokens: tokensOutput,
    output: tokensOutput as T,
    errors,
  };
}
