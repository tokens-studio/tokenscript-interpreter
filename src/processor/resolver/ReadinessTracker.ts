import type { DependencyTracker } from "./DependencyTracker";
import type { RefPath } from "./types";

/**
 * Optimizes readiness checking by caching results.
 *
 * Readiness checking (whether all dependencies are resolved) can be expensive
 * when done repeatedly. This class caches the state and invalidates intelligently
 * when dependencies change.
 */
export class ReadinessTracker {
  private readonly readyCache = new Map<RefPath, boolean>();

  /**
   * Check if a token is ready to be resolved.
   * Results are cached until marked dirty.
   */
  isReady(tokenName: RefPath, dependencyTracker: DependencyTracker): boolean {
    if (!this.readyCache.has(tokenName)) {
      const ready = dependencyTracker.isTokenReady(tokenName);
      this.readyCache.set(tokenName, ready);
      return ready;
    }
    const cached = this.readyCache.get(tokenName);
    return cached ?? false;
  }

  /**
   * Mark a token's readiness state as dirty after a dependency change
   */
  markDirty(tokenName: RefPath): void {
    this.readyCache.delete(tokenName);
  }

  /**
   * Clear all cached state (e.g., for testing)
   */
  clearCache(): void {
    this.readyCache.clear();
  }
}
