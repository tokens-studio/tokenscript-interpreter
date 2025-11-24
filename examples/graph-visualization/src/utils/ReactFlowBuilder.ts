import type { Node, Edge } from "@xyflow/react";
import type { GraphData, GraphNode } from "./GraphBuilder";

/**
 * Builds ReactFlow-specific nodes and edges from GraphData
 */
export class ReactFlowBuilder {
  private graphData: GraphData;

  constructor(graphData: GraphData) {
    this.graphData = graphData;
  }

  /**
   * Convert graph nodes to ReactFlow nodes with positions
   */
  toReactFlowNodes(): Node[] {
    const nodesWithPositions = this.layoutNodes(this.graphData.nodes);
    
    return nodesWithPositions.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position || { x: 0, y: 0 },
      data: node,
    }));
  }

  /**
   * Convert graph edges to ReactFlow edges with styling
   */
  toReactFlowEdges(): Edge[] {
    return this.graphData.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: edge.isVirtual,
      style: edge.isVirtual
        ? { stroke: "#0ea5e9", strokeWidth: 2 }
        : { stroke: "#94a3b8" },
    }));
  }

  /**
   * Layout nodes in a hierarchical tree structure using Sugiyama framework
   */
  private layoutNodes(nodes: GraphNode[]): GraphNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    
    // Build parent-child relationships
    const parents = new Map<string, Set<string>>();
    const children = new Map<string, Set<string>>();
    
    for (const edge of this.graphData.edges) {
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
