import {
  Config,
  TokenResolver,
  type InterpreterResult,
} from "@tokens-studio/tokenscript-interpreter";
import type { Node, Edge } from "@xyflow/react";
import { GraphBuilder } from "./GraphBuilder";
import { ReactFlowBuilder } from "./ReactFlowBuilder";

export type TokensInput = Record<string, string | Record<string, string>>;

/**
 * Main process function that orchestrates the token resolution,
 * graph building, and ReactFlow conversion
 */
export function process(tokensInput: TokensInput): {
  nodes: Node[];
  edges: Edge[];
} {
  const config = new Config();
  const resolver = new TokenResolver();
  const graphBuilder = new GraphBuilder();

  const tokens = flattenTokens(tokensInput);

  const callbacks = {
    onResolve: (tokenName: string, value: InterpreterResult) => {
      graphBuilder.onResolve(tokenName, value);
    },
    onError: (tokenName: string, error: Error, originalValue: unknown) => {
      graphBuilder.onError(tokenName, error, String(originalValue));
    },
  };

  const result = resolver.processTokens(tokens, callbacks, config);

  console.log("Dependencies:", Array.from(result.graph.getNodes()));
  
  graphBuilder.addDependencies(result.graph);

  const graphData = graphBuilder.getResult();
  const reactFlowBuilder = new ReactFlowBuilder(graphData);

  return {
    nodes: reactFlowBuilder.toReactFlowNodes(),
    edges: reactFlowBuilder.toReactFlowEdges(),
  };
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
