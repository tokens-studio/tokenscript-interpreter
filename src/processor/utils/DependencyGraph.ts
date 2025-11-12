export class DependencyGraph<N = string> {
  private nodes = new Map<N, Set<N>>();

  addNode(node: N, dependencies: N[] | Set<N> = []): void {
    if (!this.nodes.has(node)) {
      this.nodes.set(node, new Set(dependencies));
    }
  }

  getNodes(): Map<N, Set<N>> {
    return this.nodes;
  }

  // Find nodes with no dependencies
  entryNodes(): N[] {
    const entries: N[] = [];
    for (const [node, deps] of this.nodes) {
      if (deps.size === 0) {
        entries.push(node);
      }
    }
    return entries;
  }

  // Find a cycle in the graph starting from the given nodes
  private findCycle(candidateNodes: N[]): N[] {
    const visited = new Set<N>();
    const recursionStack = new Set<N>();
    const path: N[] = [];

    const dfs = (node: N): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = this.nodes.get(node);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) {
            if (dfs(dep)) {
              return true;
            }
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      path.pop();
      recursionStack.delete(node);
      return false;
    };

    for (const node of candidateNodes) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return path;
        }
      }
    }

    return candidateNodes;
  }

  // Topological sort using Kahn's algorithm
  topologicalSort(): N[] {
    const inDegree = new Map<N, number>();
    const result: N[] = [];

    // Calculate in-degrees
    for (const node of this.nodes.keys()) {
      inDegree.set(node, 0);
    }
    for (const deps of this.nodes.values()) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Queue nodes with no dependencies
    const queue: N[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) break;
      result.push(node);

      // Reduce in-degree for dependents
      const deps = this.nodes.get(node) || new Set();
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // If result doesn't contain all nodes, there's a cycle
    if (result.length !== this.nodes.size) {
      const resultSet = new Set(result);
      const remainingNodes: N[] = [];
      for (const node of this.nodes.keys()) {
        if (!resultSet.has(node)) {
          remainingNodes.push(node);
        }
      }
      const cycle = this.findCycle(remainingNodes);
      throw new Error(
        `Circular dependency detected: ${cycle.map((n) => String(n)).join(" → ")} → ${String(cycle[0])}`,
      );
    }

    return result;
  }
}
