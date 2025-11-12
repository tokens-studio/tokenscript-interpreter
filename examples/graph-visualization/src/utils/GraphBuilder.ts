import {
  flattenChildrenObject,
  serializeInterpreterResult,
  type TokenBuilder,
} from "@tokens-studio/tokenscript-interpreter";
import type { ISymbolType } from "@tokens-studio/tokenscript-interpreter";

// InterpreterResult type: ISymbolType | string | null
type InterpreterResult = ISymbolType | string | null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type GraphNodeType = "token" | "virtual" | "value";

export type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
  value?: unknown;
  valueType?: string;
  isVirtual?: boolean;
  isError?: boolean;
  preview?: string;
  position?: { x: number; y: number };
  source?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  isVirtual?: boolean;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Builds a graph structure from resolved tokens for visualization
 */
export class GraphBuilder implements TokenBuilder<GraphData> {
  readonly name = "graph";

  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private originalTokens = new Set<string>();
  private errorTokens = new Map<string, { error: Error; originalValue: string }>();

  constructor() {}

  onResolve(tokenName: string, value: InterpreterResult): void {
    this.originalTokens.add(tokenName);
    this.toGraphNode(tokenName, value, false);
  }

  onError(tokenName: string, error: Error, originalValue: string): void {
    this.originalTokens.add(tokenName);
    this.errorTokens.set(tokenName, { error, originalValue });
    
    const node: GraphNode = {
      id: tokenName,
      label: tokenName,
      type: "token",
      value: undefined,
      valueType: "error",
      isVirtual: false,
      isError: true,
      preview: error.message,
      source: originalValue,
    };
    
    this.nodes.set(tokenName, node);
  }

  /**
   * Add dependency edges after all tokens are resolved.
   * This should be called with the graph from processTokens result.
   */
  addDependencies(graph: { getNodes(): Map<string, Set<string>> }): void {
    for (const [node, deps] of graph.getNodes()) {
      if (deps.size === 0) continue;
      
      for (const dep of deps) {
        const edgeId = `${dep}-${node}`;
        const isVirtual = !this.originalTokens.has(node) || !this.originalTokens.has(dep);

        this.edges.push({
          id: edgeId,
          source: dep,
          target: node,
          isVirtual,
        });
      }
    }
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  private toGraphNode(tokenName: string, value: InterpreterResult, isVirtual: boolean): void {
    const valueType = this.getValueType(value);
    const serialized = serializeInterpreterResult(value);
    const preview = this.getPreview(value, valueType);

    const node: GraphNode = {
      id: tokenName,
      label: tokenName,
      type: isVirtual ? "virtual" : "token",
      value: serialized,
      valueType,
      isVirtual,
      isError: false,
      preview,
    };

    this.nodes.set(tokenName, node);
    
    // Process nested children (e.g., object properties, list items)
    flattenChildrenObject(value, tokenName, (newKey, childValue) => {
      if (this.originalTokens.has(newKey)) {
        return;
      }

      const childSerialized = serializeInterpreterResult(childValue);
      const childValueType = this.getValueType(childValue);
      const childPreview = this.getPreview(childValue, childValueType);

      const childNode: GraphNode = {
        id: newKey,
        label: newKey,
        type: "value",
        value: childSerialized,
        valueType: childValueType,
        isVirtual: true,
        isError: false,
        preview: childPreview,
      };

      this.nodes.set(newKey, childNode);

      // Add edge from parent to child
      this.edges.push({
        id: `${tokenName}-${newKey}`,
        source: tokenName,
        target: newKey,
        isVirtual: true,
      });
    });
  }

  getResult(): GraphData {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    };
  }

  private getValueType(value: InterpreterResult): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (isObject(value)) {
      if ("type" in value) {
        return value.type;
      }
      return "object";
    }
    return "unknown";
  }

  private getPreview(value: InterpreterResult, valueType: string): string {
    const maxLength = 50;

    if (value === null) return "null";
    if (value === undefined) return "undefined";

    switch (valueType) {
      case "string":
      case "number":
      case "boolean": {
        const str = String(value);
        return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
      }

      case "color": {
        if (
          isObject(value) &&
          "serialize" in value &&
          typeof value.serialize === "function"
        ) {
          return String(value.serialize());
        }
        return "Color";
      }

      case "list": {
        if (isObject(value) && "length" in value && typeof value.length === "number") {
          return `List (${value.length} items)`;
        }
        return "List";
      }

      case "dictionary": {
        if (
          isObject(value) &&
          "entries" in value &&
          value.entries instanceof Map
        ) {
          const keys = Array.from(value.entries.keys()).slice(0, 3);
          const preview = keys.join(", ");
          return keys.length < value.entries.size
            ? `{ ${preview}, ... }`
            : `{ ${preview} }`;
        }
        return "Dictionary";
      }

      case "dimension":
      case "duration":
      case "percentage": {
        if (
          isObject(value) &&
          "serialize" in value &&
          typeof value.serialize === "function"
        ) {
          return String(value.serialize());
        }
        return valueType;
      }

      default: {
        const str = String(value);
        return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
      }
    }
  }
}
