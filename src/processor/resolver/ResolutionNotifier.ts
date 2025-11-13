import type { InterpreterResult } from "@interpreter/interpreter";
import type { DependencyTracker } from "./DependencyTracker";
import type { PrefixManager } from "./PrefixManager";
import type { ReadinessTracker } from "./ReadinessTracker";
import type { RefPath } from "./types";

/**
 * Centralizes dependency and prefix release notification logic with cascade resolution.
 *
 * Eliminates repeated patterns for:
 * - Releasing token dependencies
 * - Releasing prefix constraints
 * - Cascade resolving dependents when they become ready
 */
export class ResolutionNotifier {
  constructor(
    private readonly dependencyTracker: DependencyTracker,
    private readonly prefixManager: PrefixManager,
    private readonly readinessTracker: ReadinessTracker,
    private readonly pendingResolution: Set<RefPath>,
    private readonly readyQueue: Set<RefPath>,
    private readonly resolveCallback: (tokenName: RefPath) => void,
    private readonly buildDictionaryCallback: (
      prefix: string,
      referenceCache: Map<string, InterpreterResult>,
    ) => void,
  ) {}

  /**
   * Release all dependencies and prefixes for a token and its flattened children.
   * This is called after a token has been successfully resolved.
   * Triggers cascade resolution of any newly-ready dependents.
   */
  releaseDependencies(
    tokenName: RefPath,
    flattened: RefPath[] | undefined,
    referenceCache: Map<string, InterpreterResult>,
  ): void {
    this.releaseDependentsFor(tokenName);
    this.releasePrefixesFor(tokenName, referenceCache);

    if (flattened) {
      for (const flatName of flattened) {
        this.releaseDependentsFor(flatName);
        this.releasePrefixesFor(flatName, referenceCache);
      }
    }
  }

  /**
   * Release dependents waiting for a specific token and add to ready queue
   */
  private releaseDependentsFor(name: RefPath): void {
    for (const dependent of this.dependencyTracker.getTokenDependentsIterable(name)) {
      if (this.pendingResolution.has(dependent)) continue;

      this.dependencyTracker.removeTokenDependency(dependent, name);
      this.readinessTracker.markDirty(dependent);

      if (this.readinessTracker.isReady(dependent, this.dependencyTracker)) {
        this.readyQueue.add(dependent);
      }
    }
  }

  /**
   * Release prefixes that may now be complete after a token resolution
   */
  private releasePrefixesFor(name: RefPath, referenceCache: Map<string, InterpreterResult>): void {
    const readyPrefixes = this.prefixManager.markTokenResolved(name);
    if (readyPrefixes.length === 0) return;

    for (const prefix of readyPrefixes) {
      this.releasePrefixDependents(prefix, referenceCache);
    }
  }

  /**
   * Release tokens waiting for a specific prefix and add to ready queue
   */
  private releasePrefixDependents(
    prefix: string,
    referenceCache: Map<string, InterpreterResult>,
  ): void {
    // Build dictionary for this prefix
    this.buildDictionaryCallback(prefix, referenceCache);

    // Release tokens waiting for this prefix
    for (const tokenName of this.dependencyTracker.getTokensWaitingForPrefixIterable(prefix)) {
      if (this.pendingResolution.has(tokenName)) continue;

      this.dependencyTracker.removePrefixDependency(tokenName, prefix);
      this.readinessTracker.markDirty(tokenName);

      if (this.readinessTracker.isReady(tokenName, this.dependencyTracker)) {
        this.readyQueue.add(tokenName);
      }
    }
  }
}
