import { DependencyTracker } from "@src/processor/resolver";
import { beforeEach, describe, expect, it } from "vitest";

describe("DependencyTracker", () => {
  let tracker: DependencyTracker;

  beforeEach(() => {
    tracker = new DependencyTracker();
  });

  describe("Token Dependencies", () => {
    it("should add token dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");

      const dependencies = tracker.getTokenDependencies("token-a");
      expect(dependencies.has("token-b")).toBe(true);
    });

    it("should track multiple dependencies for a single token", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-a", "token-c");
      tracker.addTokenDependency("token-a", "token-d");

      const dependencies = tracker.getTokenDependencies("token-a");
      expect(dependencies.size).toBe(3);
      expect(dependencies.has("token-b")).toBe(true);
      expect(dependencies.has("token-c")).toBe(true);
      expect(dependencies.has("token-d")).toBe(true);
    });

    it("should track reverse dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-c", "token-b");

      const dependents = tracker.getTokenDependents("token-b");
      expect(dependents.size).toBe(2);
      expect(dependents.has("token-a")).toBe(true);
      expect(dependents.has("token-c")).toBe(true);
    });

    it("should remove token dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-a", "token-c");

      tracker.removeTokenDependency("token-a", "token-b");

      const dependencies = tracker.getTokenDependencies("token-a");
      expect(dependencies.has("token-b")).toBe(false);
      expect(dependencies.has("token-c")).toBe(true);
    });

    it("should remove reverse dependencies when removing token dependency", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.removeTokenDependency("token-a", "token-b");

      const dependents = tracker.getTokenDependents("token-b");
      expect(dependents.size).toBe(0);
    });

    it("should return empty set for nonexistent token dependencies", () => {
      const dependencies = tracker.getTokenDependencies("nonexistent");
      expect(dependencies.size).toBe(0);
    });

    it("should return empty set for nonexistent dependents", () => {
      const dependents = tracker.getTokenDependents("nonexistent");
      expect(dependents.size).toBe(0);
    });

    it("should prevent external mutation of returned dependency set", () => {
      tracker.addTokenDependency("token-a", "token-b");
      const deps = tracker.getTokenDependencies("token-a");
      deps.add("token-c");

      // Original should not be modified
      const depsAgain = tracker.getTokenDependencies("token-a");
      expect(depsAgain.size).toBe(1);
      expect(depsAgain.has("token-c")).toBe(false);
    });

    it("should handle duplicate dependency additions idempotently", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-a", "token-b");

      const dependencies = tracker.getTokenDependencies("token-a");
      expect(dependencies.size).toBe(1);
    });
  });

  describe("Prefix Dependencies", () => {
    it("should add prefix dependencies", () => {
      tracker.addPrefixDependency("token-a", "prefix.x");

      const prefixes = tracker.getPrefixDependencies("token-a");
      expect(prefixes.has("prefix.x")).toBe(true);
    });

    it("should track multiple prefix dependencies", () => {
      tracker.addPrefixDependency("token-a", "colors");
      tracker.addPrefixDependency("token-a", "spacing");
      tracker.addPrefixDependency("token-a", "typography");

      const prefixes = tracker.getPrefixDependencies("token-a");
      expect(prefixes.size).toBe(3);
      expect(prefixes.has("colors")).toBe(true);
      expect(prefixes.has("spacing")).toBe(true);
      expect(prefixes.has("typography")).toBe(true);
    });

    it("should track tokens waiting for a prefix", () => {
      tracker.addPrefixDependency("token-a", "colors");
      tracker.addPrefixDependency("token-b", "colors");
      tracker.addPrefixDependency("token-c", "spacing");

      const waitingTokens = tracker.getTokensWaitingForPrefix("colors");
      expect(waitingTokens.size).toBe(2);
      expect(waitingTokens.has("token-a")).toBe(true);
      expect(waitingTokens.has("token-b")).toBe(true);
    });

    it("should remove prefix dependencies", () => {
      tracker.addPrefixDependency("token-a", "colors");
      tracker.addPrefixDependency("token-a", "spacing");

      tracker.removePrefixDependency("token-a", "colors");

      const prefixes = tracker.getPrefixDependencies("token-a");
      expect(prefixes.has("colors")).toBe(false);
      expect(prefixes.has("spacing")).toBe(true);
    });

    it("should remove reverse prefix dependencies when removing prefix dependency", () => {
      tracker.addPrefixDependency("token-a", "colors");
      tracker.addPrefixDependency("token-b", "colors");

      tracker.removePrefixDependency("token-a", "colors");

      const waitingTokens = tracker.getTokensWaitingForPrefix("colors");
      expect(waitingTokens.size).toBe(1);
      expect(waitingTokens.has("token-b")).toBe(true);
    });

    it("should prevent external mutation of returned prefix dependency set", () => {
      tracker.addPrefixDependency("token-a", "colors");
      const prefixes = tracker.getPrefixDependencies("token-a");
      prefixes.add("spacing");

      // Original should not be modified
      const prefixesAgain = tracker.getPrefixDependencies("token-a");
      expect(prefixesAgain.size).toBe(1);
      expect(prefixesAgain.has("spacing")).toBe(false);
    });
  });

  describe("Readiness Checking", () => {
    it("should indicate token is ready when it has no dependencies", () => {
      expect(tracker.isTokenReady("token-a")).toBe(true);
    });

    it("should indicate token is not ready when it has token dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");
      expect(tracker.isTokenReady("token-a")).toBe(false);
    });

    it("should indicate token is not ready when it has prefix dependencies", () => {
      tracker.addPrefixDependency("token-a", "colors");
      expect(tracker.isTokenReady("token-a")).toBe(false);
    });

    it("should indicate token is not ready when it has both types of dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addPrefixDependency("token-a", "colors");
      expect(tracker.isTokenReady("token-a")).toBe(false);
    });

    it("should indicate token becomes ready after removing all dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-a", "token-c");
      tracker.addPrefixDependency("token-a", "colors");

      expect(tracker.isTokenReady("token-a")).toBe(false);

      tracker.removeTokenDependency("token-a", "token-b");
      expect(tracker.isTokenReady("token-a")).toBe(false);

      tracker.removeTokenDependency("token-a", "token-c");
      expect(tracker.isTokenReady("token-a")).toBe(false);

      tracker.removePrefixDependency("token-a", "colors");
      expect(tracker.isTokenReady("token-a")).toBe(true);
    });
  });

  describe("State Checking", () => {
    it("should report no dependencies when tracker is empty", () => {
      expect(tracker.hasAnyDependencies()).toBe(false);
    });

    it("should report dependencies when token dependency is added", () => {
      tracker.addTokenDependency("token-a", "token-b");
      expect(tracker.hasAnyDependencies()).toBe(true);
    });

    it("should report dependencies when prefix dependency is added", () => {
      tracker.addPrefixDependency("token-a", "colors");
      expect(tracker.hasAnyDependencies()).toBe(true);
    });

    it("should report no dependencies after all are removed", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addPrefixDependency("token-c", "colors");

      tracker.removeTokenDependency("token-a", "token-b");
      tracker.removePrefixDependency("token-c", "colors");

      expect(tracker.hasAnyDependencies()).toBe(false);
    });

    it("should get all unresolved tokens", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-c", "token-d");
      tracker.addPrefixDependency("token-e", "colors");

      const unresolved = tracker.getUnresolvedTokens();
      expect(unresolved.sort()).toEqual(["token-a", "token-c", "token-e"].sort());
    });

    it("should not duplicate unresolved tokens", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addPrefixDependency("token-a", "colors");

      const unresolved = tracker.getUnresolvedTokens();
      expect(unresolved.length).toBe(1);
      expect(unresolved[0]).toBe("token-a");
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle complex dependency chains", () => {
      // A -> B -> C chain
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-b", "token-c");
      tracker.addTokenDependency("token-c", "token-d");

      expect(tracker.isTokenReady("token-a")).toBe(false);
      expect(tracker.isTokenReady("token-b")).toBe(false);
      expect(tracker.isTokenReady("token-c")).toBe(false);
      expect(tracker.isTokenReady("token-d")).toBe(true);

      // Resolve D
      const d_dependents = tracker.getTokenDependents("token-d");
      expect(d_dependents.has("token-c")).toBe(true);
      tracker.removeTokenDependency("token-c", "token-d");
      expect(tracker.isTokenReady("token-c")).toBe(true);
    });

    it("should handle diamond dependency patterns", () => {
      // Diamond: A -> B, A -> C, B -> D, C -> D
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addTokenDependency("token-a", "token-c");
      tracker.addTokenDependency("token-b", "token-d");
      tracker.addTokenDependency("token-c", "token-d");

      expect(tracker.isTokenReady("token-d")).toBe(true);
      expect(tracker.isTokenReady("token-b")).toBe(false);
      expect(tracker.isTokenReady("token-c")).toBe(false);

      const d_dependents = tracker.getTokenDependents("token-d");
      expect(d_dependents.size).toBe(2);
      expect(d_dependents.has("token-b")).toBe(true);
      expect(d_dependents.has("token-c")).toBe(true);
    });

    it("should handle mixed token and prefix dependencies", () => {
      tracker.addTokenDependency("token-a", "token-b");
      tracker.addPrefixDependency("token-a", "colors");
      tracker.addTokenDependency("token-c", "token-d");
      tracker.addPrefixDependency("token-c", "spacing");

      expect(tracker.isTokenReady("token-a")).toBe(false);
      expect(tracker.isTokenReady("token-c")).toBe(false);

      tracker.removeTokenDependency("token-a", "token-b");
      expect(tracker.isTokenReady("token-a")).toBe(false); // Still waiting for colors prefix

      tracker.removePrefixDependency("token-a", "colors");
      expect(tracker.isTokenReady("token-a")).toBe(true);
    });

    it("should handle mass removal of dependencies for a token", () => {
      for (let i = 0; i < 10; i++) {
        tracker.addTokenDependency("token-a", `dep-${i}`);
      }
      for (let i = 0; i < 5; i++) {
        tracker.addPrefixDependency("token-a", `prefix-${i}`);
      }

      expect(tracker.isTokenReady("token-a")).toBe(false);

      for (let i = 0; i < 10; i++) {
        tracker.removeTokenDependency("token-a", `dep-${i}`);
      }
      expect(tracker.isTokenReady("token-a")).toBe(false);

      for (let i = 0; i < 5; i++) {
        tracker.removePrefixDependency("token-a", `prefix-${i}`);
      }
      expect(tracker.isTokenReady("token-a")).toBe(true);
    });
  });
});
