import {
  flattenChildrenObject,
  serializeInterpreterResult,
  type TokenBuilder,
} from "@tokens-studio/tokenscript-interpreter";
import type { ISymbolType } from "@tokens-studio/tokenscript-interpreter";

// interpreterResult type: ISymbolType | string | null
type interpreterResult = ISymbolType | string | null;

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

  onResolve(tokenName: string, value: interpreterResult): void {
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

  private toGraphNode(tokenName: string, value: interpreterResult, isVirtual: boolean): void {
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
    const nodes = Array.from(this.nodes.values());
    return {
      nodes: this.layoutNodes(nodes),
      edges: this.edges,
    };
  }

  private getValueType(value: interpreterResult): string {
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

  private getPreview(value: interpreterResult, valueType: string): string {
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

  /**
   * Layout nodes in a hierarchical tree structure using Sugiyama framework
   */
  private layoutNodes(nodes: GraphNode[]): GraphNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    
    // Build parent-child relationships
    const parents = new Map<string, Set<string>>();
    const children = new Map<string, Set<string>>();
    
    for (const edge of this.edges) {
      if (!children.has(edge.source)) {
        children.set(edge.source, new Set());
      }
      children.get(edge.source)?.add(edge.target);
      
      if (!parents.has(edge.target)) {
        parents.set(edge.target, new Set());
      }
      parents.get(edge.target)?.add(edge.source);
    }

    // Find root nodes (no parents)
    const roots: string[] = [];
    for (const node of nodes) {
      if (!parents.has(node.id) || parents.get(node.id)?.size === 0) {
        roots.push(node.id);
      }
    }

    // Assign layers using longest path
    const layers = new Map<string, number>();
    const assignLayer = (nodeId: string, visited = new Set<string>()): number => {
      if (layers.has(nodeId)) {
        return layers.get(nodeId)!;
      }
      
      if (visited.has(nodeId)) {
        return 0; // Circular dependency
      }
      
      visited.add(nodeId);
      
      const nodeParents = parents.get(nodeId);
      if (!nodeParents || nodeParents.size === 0) {
        layers.set(nodeId, 0);
        return 0;
      }
      
      let maxParentLayer = -1;
      for (const parentId of nodeParents) {
        const parentLayer = assignLayer(parentId, new Set(visited));
        maxParentLayer = Math.max(maxParentLayer, parentLayer);
      }
      
      const layer = maxParentLayer + 1;
      layers.set(nodeId, layer);
      return layer;
    };

    // Assign layers to all nodes
    for (const node of nodes) {
      assignLayer(node.id);
    }

    // Group nodes by layer
    const layerGroups = new Map<number, string[]>();
    for (const [nodeId, layer] of layers) {
      if (!layerGroups.has(layer)) {
        layerGroups.set(layer, []);
      }
      layerGroups.get(layer)?.push(nodeId);
    }

    // Calculate positions with better spacing
    const horizontalSpacing = 250;
    const verticalSpacing = 120;

    // Calculate x positions trying to center children under parents
    const positions = new Map<string, { x: number; y: number }>();
    
    // Sort layers
    const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
    
    for (const layer of sortedLayers) {
      const nodeIds = layerGroups.get(layer)!;
      const y = layer * verticalSpacing;
      
      if (layer === 0) {
        // Position root nodes centered
        const totalWidth = (nodeIds.length - 1) * horizontalSpacing;
        const startX = -totalWidth / 2;
        
        nodeIds.forEach((nodeId, index) => {
          positions.set(nodeId, {
            x: startX + index * horizontalSpacing,
            y,
          });
        });
      } else {
        // Group nodes by their parent
        const nodesByParent = new Map<string, string[]>();
        const nodesWithoutParent: string[] = [];
        
        for (const nodeId of nodeIds) {
          const nodeParents = parents.get(nodeId);
          if (nodeParents && nodeParents.size > 0) {
            // Get first parent (for simplicity)
            const parentId = Array.from(nodeParents)[0];
            if (!nodesByParent.has(parentId)) {
              nodesByParent.set(parentId, []);
            }
            nodesByParent.get(parentId)!.push(nodeId);
          } else {
            nodesWithoutParent.push(nodeId);
          }
        }
        
        // Position children under each parent
        for (const [parentId, childIds] of nodesByParent) {
          const parentPos = positions.get(parentId);
          if (parentPos) {
            // Spread children horizontally centered under parent
            const childCount = childIds.length;
            const totalChildWidth = (childCount - 1) * horizontalSpacing;
            const startX = parentPos.x - totalChildWidth / 2;
            
            childIds.forEach((childId, index) => {
              positions.set(childId, {
                x: startX + index * horizontalSpacing,
                y,
              });
            });
          }
        }
        
        // Position nodes without parents
        if (nodesWithoutParent.length > 0) {
          const totalWidth = (nodesWithoutParent.length - 1) * horizontalSpacing;
          const startX = -totalWidth / 2;
          
          nodesWithoutParent.forEach((nodeId, index) => {
            positions.set(nodeId, {
              x: startX + index * horizontalSpacing,
              y,
            });
          });
        }
      }
    }

    // Apply positions to nodes
    for (const [nodeId, pos] of positions) {
      const node = nodeMap.get(nodeId);
      if (node) {
        node.position = pos;
      }
    }

    // Handle any unpositioned nodes
    for (const node of nodes) {
      if (!node.position) {
        node.position = { x: 0, y: 0 };
      }
    }

    return nodes;
  }
}
