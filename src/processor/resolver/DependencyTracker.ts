/**
 * Tracks token and prefix dependencies required for prefix resolution.
 *
 * Maintains bidirectional maps for both token and prefix dependencies,
 * enabling efficient lookups in both directions and readiness checking.
 */
export class DependencyTracker {
  private readonly tokenDeps = new Map<string, Set<string>>();
  private readonly reverseDeps = new Map<string, Set<string>>();
  private readonly prefixDeps = new Map<string, Set<string>>();
  private readonly prefixReverseDeps = new Map<string, Set<string>>();

  addTokenDependency(dependent: string, dependency: string): void {
    this.addToSetMap(this.tokenDeps, dependent, dependency);
    this.addToSetMap(this.reverseDeps, dependency, dependent);
  }

  removeTokenDependency(dependent: string, dependency: string): void {
    this.removeFromSetMap(this.tokenDeps, dependent, dependency);
    this.removeFromSetMap(this.reverseDeps, dependency, dependent);
  }

  addPrefixDependency(dependent: string, prefix: string): void {
    this.addToSetMap(this.prefixDeps, dependent, prefix);
    this.addToSetMap(this.prefixReverseDeps, prefix, dependent);
  }

  removePrefixDependency(dependent: string, prefix: string): void {
    this.removeFromSetMap(this.prefixDeps, dependent, prefix);
    this.removeFromSetMap(this.prefixReverseDeps, prefix, dependent);
  }

  getTokenDependents(token: string): Set<string> {
    return this.cloneSet(this.reverseDeps.get(token));
  }

  getTokensWaitingForPrefix(prefix: string): Set<string> {
    return this.cloneSet(this.prefixReverseDeps.get(prefix));
  }

  getTokenDependencies(token: string): Set<string> {
    return this.cloneSet(this.tokenDeps.get(token));
  }

  getPrefixDependencies(token: string): Set<string> {
    return this.cloneSet(this.prefixDeps.get(token));
  }

  isTokenReady(token: string): boolean {
    const tokenDeps = this.tokenDeps.get(token);
    const prefixDeps = this.prefixDeps.get(token);
    return (!tokenDeps || tokenDeps.size === 0) && (!prefixDeps || prefixDeps.size === 0);
  }

  hasAnyDependencies(): boolean {
    return this.tokenDeps.size > 0 || this.prefixDeps.size > 0;
  }

  getUnresolvedTokens(): string[] {
    const unresolved = new Set<string>();
    for (const [token] of this.tokenDeps) unresolved.add(token);
    for (const [token] of this.prefixDeps) unresolved.add(token);
    return Array.from(unresolved);
  }

  private addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    let set = map.get(key);
    if (!set) {
      set = new Set<V>();
      map.set(key, set);
    }
    set.add(value);
  }

  private removeFromSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    const set = map.get(key);
    if (!set) return;
    set.delete(value);
    if (set.size === 0) {
      map.delete(key);
    }
  }

  private cloneSet(values?: Set<string>): Set<string> {
    return values ? new Set(values) : new Set();
  }
}
