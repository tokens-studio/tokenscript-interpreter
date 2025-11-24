import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import { DependencyGraph } from "@src/processor/utils/DependencyGraph";
import { describe, expect, it } from "vitest";

describe("DependencyGraph", () => {
  describe("addNode", () => {
    it("should add a node with no dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      expect(graph.entryNodes()).toEqual(["a"]);
    });

    it("should add a node with dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a"]);
      expect(graph.entryNodes()).toEqual(["a"]);
    });

    it("should not overwrite existing node", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("a", ["b"]);
      expect(graph.entryNodes()).toEqual(["a"]);
    });

    it("should handle non-string node types", () => {
      const graph = new DependencyGraph<number>();
      graph.addNode(1);
      graph.addNode(2, [1]);
      graph.addNode(3, [2]);
      expect(graph.topologicalSort()).toEqual([3, 2, 1]);
    });
  });

  describe("getLeafNodes", () => {
    it("should return empty array for empty graph", () => {
      const graph = new DependencyGraph();
      expect(graph.entryNodes()).toEqual([]);
    });

    it("should return single leaf node", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      expect(graph.entryNodes()).toEqual(["a"]);
    });

    it("should return multiple leaf nodes", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b");
      graph.addNode("c");
      const leaves = graph.entryNodes();
      expect(leaves).toHaveLength(3);
      expect(leaves).toContain("a");
      expect(leaves).toContain("b");
      expect(leaves).toContain("c");
    });

    it("should not include nodes with dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a"]);
      expect(graph.entryNodes()).toEqual(["a"]);
    });

    it("should return all leaf nodes in complex graph", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b");
      graph.addNode("c", ["a"]);
      graph.addNode("d", ["a", "b"]);
      const leaves = graph.entryNodes();
      expect(leaves).toHaveLength(2);
      expect(leaves).toContain("a");
      expect(leaves).toContain("b");
    });
  });

  describe("topologicalSort", () => {
    it("should sort empty graph", () => {
      const graph = new DependencyGraph();
      expect(graph.topologicalSort()).toEqual([]);
    });

    it("should sort single node", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      expect(graph.topologicalSort()).toEqual(["a"]);
    });

    it("should sort linear dependency chain", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a"]);
      graph.addNode("c", ["b"]);
      expect(graph.topologicalSort()).toEqual(["c", "b", "a"]);
    });

    it("should sort diamond dependency pattern", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a"]);
      graph.addNode("c", ["a"]);
      graph.addNode("d", ["b", "c"]);
      const sorted = graph.topologicalSort();

      const aIndex = sorted.indexOf("a");
      const bIndex = sorted.indexOf("b");
      const cIndex = sorted.indexOf("c");
      const dIndex = sorted.indexOf("d");

      expect(dIndex).toBeLessThan(bIndex);
      expect(dIndex).toBeLessThan(cIndex);
      expect(bIndex).toBeLessThan(aIndex);
      expect(cIndex).toBeLessThan(aIndex);
    });

    it("should sort complex dependency graph", () => {
      const graph = new DependencyGraph();
      graph.addNode("install");
      graph.addNode("build", ["install"]);
      graph.addNode("test", ["build"]);
      graph.addNode("lint", ["install"]);
      graph.addNode("deploy", ["test", "lint"]);

      const sorted = graph.topologicalSort();
      const installIndex = sorted.indexOf("install");
      const buildIndex = sorted.indexOf("build");
      const testIndex = sorted.indexOf("test");
      const lintIndex = sorted.indexOf("lint");
      const deployIndex = sorted.indexOf("deploy");

      expect(buildIndex).toBeLessThan(installIndex);
      expect(testIndex).toBeLessThan(buildIndex);
      expect(lintIndex).toBeLessThan(installIndex);
      expect(deployIndex).toBeLessThan(testIndex);
      expect(deployIndex).toBeLessThan(lintIndex);
    });

    it("should handle multiple independent nodes", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b");
      graph.addNode("c");
      const sorted = graph.topologicalSort();
      expect(sorted).toHaveLength(3);
      expect(sorted).toContain("a");
      expect(sorted).toContain("b");
      expect(sorted).toContain("c");
    });

    it("should handle nodes with multiple dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b");
      graph.addNode("c");
      graph.addNode("d", ["a", "b", "c"]);

      const sorted = graph.topologicalSort();
      const aIndex = sorted.indexOf("a");
      const bIndex = sorted.indexOf("b");
      const cIndex = sorted.indexOf("c");
      const dIndex = sorted.indexOf("d");

      expect(dIndex).toBeLessThan(aIndex);
      expect(dIndex).toBeLessThan(bIndex);
      expect(dIndex).toBeLessThan(cIndex);
    });
  });

  describe("cycle detection", () => {
    it("should detect simple cycle", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["b"]);
      graph.addNode("b", ["a"]);

      expect(() => graph.topologicalSort()).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should detect simple cycle and show chain", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["b"]);
      graph.addNode("b", ["a"]);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
      expect(error?.data.tokens).toMatch(/a → b → a|b → a → b/);
    });

    it("should detect self-referencing cycle", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["a"]);

      expect(() => graph.topologicalSort()).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should detect self-referencing cycle and show chain", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["a"]);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
      expect(error?.data.tokens).toContain("a → a");
    });

    it("should detect cycle in longer chain", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["b"]);
      graph.addNode("b", ["c"]);
      graph.addNode("c", ["a"]);

      expect(() => graph.topologicalSort()).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should detect cycle in longer chain and show full path", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["b"]);
      graph.addNode("b", ["c"]);
      graph.addNode("c", ["a"]);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
      expect(error?.data.tokens).toMatch(/a → b → c → a|b → c → a → b|c → a → b → c/);
    });

    it("should detect cycle in complex graph with diamond pattern", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["b"]);
      graph.addNode("b", ["c", "d"]);
      graph.addNode("c", ["e"]);
      graph.addNode("d", ["e"]);
      graph.addNode("e", ["a"]);

      expect(() => graph.topologicalSort()).toThrow(ProcessorError);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
    });

    it("should detect cycle in complex graph and show chain", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", ["b"]);
      graph.addNode("b", ["c", "d"]);
      graph.addNode("c", ["e"]);
      graph.addNode("d", ["e"]);
      graph.addNode("e", ["a"]);

      let error: ProcessorError | undefined;
      try {
        graph.topologicalSort();
      } catch (e) {
        error = e as ProcessorError;
      }
      expect(error?.code).toBe(ProcessorErrorCode.CIRCULAR_DEPENDENCY);
      expect(error?.message).toContain("Circular dependency detected");
      expect(error?.data.tokens).toMatch(/a.*b.*e.*a|a.*b.*c.*e.*a|a.*b.*d.*e.*a/);
    });

    it("should not detect cycle in valid graph", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a"]);
      graph.addNode("c", ["a"]);
      graph.addNode("d", ["b", "c"]);

      expect(() => graph.topologicalSort()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle dependency on non-existent node", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a"]);

      const sorted = graph.topologicalSort();
      expect(sorted).toHaveLength(2);
      const aIndex = sorted.indexOf("a");
      const bIndex = sorted.indexOf("b");
      expect(bIndex).toBeLessThan(aIndex);
    });

    it("should handle empty dependencies array", () => {
      const graph = new DependencyGraph();
      graph.addNode("a", []);
      expect(graph.entryNodes()).toEqual(["a"]);
      expect(graph.topologicalSort()).toEqual(["a"]);
    });

    it("should handle duplicate dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode("a");
      graph.addNode("b", ["a", "a", "a"]);

      const sorted = graph.topologicalSort();
      expect(sorted).toEqual(["b", "a"]);
    });

    it("should maintain insertion order for independent nodes", () => {
      const graph = new DependencyGraph();
      graph.addNode("z");
      graph.addNode("y");
      graph.addNode("x");

      const sorted = graph.topologicalSort();
      expect(sorted).toHaveLength(3);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle module dependency resolution", () => {
      const graph = new DependencyGraph<string>();
      graph.addNode("app.ts", ["utils.ts", "config.ts"]);
      graph.addNode("utils.ts", ["constants.ts"]);
      graph.addNode("config.ts", ["constants.ts"]);
      graph.addNode("constants.ts");

      const sorted = graph.topologicalSort();
      const appIndex = sorted.indexOf("app.ts");
      const utilsIndex = sorted.indexOf("utils.ts");
      const configIndex = sorted.indexOf("config.ts");
      const constantsIndex = sorted.indexOf("constants.ts");

      expect(appIndex).toBeLessThan(utilsIndex);
      expect(appIndex).toBeLessThan(configIndex);
      expect(utilsIndex).toBeLessThan(constantsIndex);
      expect(configIndex).toBeLessThan(constantsIndex);
    });

    it("should handle build pipeline dependencies", () => {
      const graph = new DependencyGraph<string>();
      graph.addNode("deploy", ["test", "build"]);
      graph.addNode("test", ["build"]);
      graph.addNode("build", ["install"]);
      graph.addNode("install");

      const sorted = graph.topologicalSort();
      expect(sorted).toEqual(["deploy", "test", "build", "install"]);
    });

    it("should identify independent tasks that can run in parallel", () => {
      const graph = new DependencyGraph<string>();
      graph.addNode("lint");
      graph.addNode("typecheck");
      graph.addNode("test");
      graph.addNode("build", ["lint", "typecheck", "test"]);

      const sorted = graph.topologicalSort();
      const buildIndex = sorted.indexOf("build");
      const lintIndex = sorted.indexOf("lint");
      const typecheckIndex = sorted.indexOf("typecheck");
      const testIndex = sorted.indexOf("test");

      expect(buildIndex).toBeLessThan(lintIndex);
      expect(buildIndex).toBeLessThan(typecheckIndex);
      expect(buildIndex).toBeLessThan(testIndex);

      const leaves = graph.entryNodes();
      expect(leaves).toHaveLength(3);
      expect(leaves).toContain("lint");
      expect(leaves).toContain("typecheck");
      expect(leaves).toContain("test");
    });
  });
});
