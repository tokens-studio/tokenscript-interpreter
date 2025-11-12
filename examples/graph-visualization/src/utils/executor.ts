import {
  Config,
  TokenResolver,
  type ISymbolType,
} from "@tokens-studio/tokenscript-interpreter";
import { GraphBuilder, type GraphData } from "./GraphBuilder";

// interpreterResult type: ISymbolType | string | null
type interpreterResult = ISymbolType | string | null;

export type TokensInput = Record<string, string | Record<string, string>>;

export function processTokensToGraph(tokensInput: TokensInput): GraphData {
  const config = new Config();
  const resolver = new TokenResolver();
  const builder = new GraphBuilder();

  const tokens = flattenTokens(tokensInput);

  const callbacks = {
    onResolve: (tokenName: string, value: interpreterResult) => {
      builder.onResolve(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: string) => {
      builder.onError(tokenName, error, originalValue);
    },
  };

  const result = resolver.processTokens(tokens, callbacks, config);

  console.log("Dependencies:", Array.from(result.graph.getNodes()));
  
  builder.addDependencies(result.graph);

  return builder.getResult();
}

/**
 * Flatten nested token structure to flat key-value pairs
 */
function flattenTokens(
  tokens: TokensInput,
  prefix = "",
): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(tokens)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result.set(fullKey, value);
    } else if (typeof value === "object" && value !== null) {
      const nested = flattenTokens(value, fullKey);
      for (const [nestedKey, nestedValue] of nested) {
        result.set(nestedKey, nestedValue);
      }
    }
  }

  return result;
}
