import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import {
  isTokenscriptSymbol,
  serializeInterpreterResult,
  stringifyInterpreterResult,
  symbolTypeToJsValue,
} from "@interpreter/symbols";
import type { LintResult, LintRunner } from "../linter";
import type { ObjectParser } from "../object-parsers";
import { type ProcessorOutput, TokenResolver } from "../resolver/TokenResolver";
import type { TokenData } from "../utils/tokens";
import { MapBuilder } from "./MapBuilder";
import type { OutputFormat, TokenBuilder } from "./types";

export { serializeInterpreterResult, stringifyInterpreterResult };

export function toJsonObject(value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (isTokenscriptSymbol(value)) return symbolTypeToJsValue(value);
  return value;
}

export function stringifyAsJson(output: unknown, indent = 2): string {
  return JSON.stringify(output, (_key, value) => toJsonObject(value), indent);
}

export interface BuildTokensOptions<T> {
  builder?: TokenBuilder<T>;
  config?: Config;
  output?: OutputFormat;
  objectParsers?: ObjectParser[];
  linter?: LintRunner;
}

export function buildTokens<T = Map<string, InterpreterResult>>(
  tokens: Map<string, string | TokenData>,
  options?: BuildTokensOptions<T>,
): ProcessorOutput & {
  output: T;
  lint?: LintResult;
} {
  const {
    config,
    output = "string",
    builder = new MapBuilder(output),
    objectParsers,
    linter,
  } = options ?? {};

  const resolver = new TokenResolver();
  const errors: Map<string, Error> = new Map();

  // Always create a MapBuilder for the tokens map output
  const tokensMapBuilder = builder instanceof MapBuilder ? builder : new MapBuilder(output);

  const callbacks = {
    onResolve: (tokenName: string, value: InterpreterResult) => {
      builder.onResolve(tokenName, value);

      // If using a non-Map builder, also populate the map for the tokens property
      if (!(builder instanceof MapBuilder)) tokensMapBuilder.onResolve(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      builder.onError(tokenName, error, originalValue);
      errors.set(tokenName, error);

      // If using a non-Map builder, also populate the map for the tokens property
      if (!(builder instanceof MapBuilder))
        tokensMapBuilder.onError(tokenName, error, originalValue);
    },
  };

  const result = resolver.processTokens(tokens, callbacks, config, objectParsers, linter);

  let tokensMap = tokensMapBuilder.getResult();
  const builderOutput = builder.getResult();

  // Filter out sub-field paths from both outputs
  if (result.subFieldPaths && result.subFieldPaths.size > 0) {
    tokensMap = new Map(tokensMap);
    for (const subFieldPath of result.subFieldPaths) {
      tokensMap.delete(subFieldPath);
      errors.delete(subFieldPath);
    }
  }

  const lint = result.lintIssues ? linter.aggregateResults(result.lintIssues) : undefined;

  return {
    ...result,
    tokens: tokensMap,
    output: builderOutput as T,
    errors,
    lint,
    resolver,
  };
}
