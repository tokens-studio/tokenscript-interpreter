import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import {
  isTokenscriptSymbol,
  serializeInterpreterResult,
  stringifyInterpreterResult,
} from "@interpreter/symbols";
import type { LintResult, LintRunner } from "../linter";
import type { ObjectParser } from "../object-parsers";
import { type ProcessorOutput, TokenResolver } from "../resolver/TokenResolver";
import type { TokenData } from "../utils/tokens";
import { MapBuilder } from "./MapBuilder";
import type { OutputFormat, TokenBuilder } from "./types";

export { serializeInterpreterResult, stringifyInterpreterResult };

export type TokenDataMap = Map<string, TokenData>;

export function toJsonObject(value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (isTokenscriptSymbol(value)) return value.toJs({ stringify: true });
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

/**
 * Builds tokens from a normalized TokenDataMap.
 *
 * @param tokens - Map of token names to TokenData. Must be pre-normalized to TokenData format.
 * @param options - Build options including builder, config, output format, etc.
 * @returns ProcessorOutput with resolved tokens, output, and optional lint results.
 *
 * @remarks
 * Consumers must normalize input to Map<string, TokenData> before calling this function.
 * Use normalization functions in process.ts to convert string values or Records.
 */
export function buildTokens<T = Map<string, InterpreterResult>>(
  tokens: TokenDataMap,
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

  const errors: Map<string, Error> = new Map();

  // Always create a MapBuilder for the tokens map output
  const tokensMapBuilder = builder instanceof MapBuilder ? builder : new MapBuilder(output);

  // Use build() to properly initialize the resolver for CRUD operations.
  // build() stores the PrefixResolver in the TokenResolver instance, enabling
  // updateToken, createToken, and deleteToken to work on the returned resolver.
  const result = new TokenResolver().build(tokens, config, objectParsers, linter);

  // Process all tokens - both successful and failed
  for (const [tokenName, value] of result.tokens) {
    const error = result.errors.get(tokenName);

    if (error) {
      // Token has an error - get original value as string
      const originalValue = tokens.get(tokenName);
      const originalValueStr =
        typeof originalValue === "string" ? originalValue : originalValue?.$value?.toString() || "";
      builder.onError(tokenName, error, originalValueStr);
      errors.set(tokenName, error);

      if (!(builder instanceof MapBuilder))
        tokensMapBuilder.onError(tokenName, error, originalValueStr);
    } else {
      // Token resolved successfully
      builder.onResolve(tokenName, value);

      if (!(builder instanceof MapBuilder)) tokensMapBuilder.onResolve(tokenName, value);
    }
  }

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
    resolver: result.resolver,
  };
}
