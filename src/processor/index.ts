class DependencyGraph<T = string> {
  private nodes = new Map<T, Set<T>>(); // node -> dependencies

  addNode(node: T, dependencies: T[] = []): void {
    if (!this.nodes.has(node)) {
      this.nodes.set(node, new Set(dependencies));
    }
  }

  // Find nodes with no dependencies
  getLeafNodes(): T[] {
    return Array.from(this.nodes.entries())
      .filter(([_, deps]) => deps.size === 0)
      .map(([node]) => node);
  }

  // Topological sort using Kahn's algorithm
  topologicalSort(): T[] {
    const inDegree = new Map<T, number>();
    const result: T[] = [];

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
    const queue = Array.from(inDegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([node]) => node);

    while (queue.length > 0) {
      const node = queue.shift()!;
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
      throw new Error("Circular dependency detected");
    }

    return result;
  }
}

export class TokenProcessor {
  public processTokens(tokens: Map<string, string>) {

  }
}
