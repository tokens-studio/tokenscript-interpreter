import type { InterpreterResult } from "@interpreter/interpreter";
import { StringSymbol } from "@interpreter/symbols";
import { PrefixManager } from "@src/processor/resolver";
import { beforeEach, describe, expect, it } from "vitest";

describe("PrefixManager", () => {
  let manager: PrefixManager;

  beforeEach(() => {
    manager = new PrefixManager();
  });

  describe("Token to Prefix Mapping", () => {
    it("should add a token to single level prefix", () => {
      manager.addTokenToPrefix("colors.primary");
      expect(manager.hasPrefix("colors")).toBe(true);
    });

    it("should add a token to multiple levels of prefixes", () => {
      manager.addTokenToPrefix("theme.colors.primary");
      expect(manager.hasPrefix("theme")).toBe(true);
      expect(manager.hasPrefix("theme.colors")).toBe(true);
    });

    it("should handle tokens without dots", () => {
      manager.addTokenToPrefix("simpleToken");
      expect(manager.hasPrefix("simpleToken")).toBe(false);
    });

    it("should track multiple tokens in same prefix", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");
      manager.addTokenToPrefix("colors.tertiary");

      expect(manager.hasPrefix("colors")).toBe(true);
    });

    it("should handle deeply nested prefixes", () => {
      manager.addTokenToPrefix("a.b.c.d.e.f");
      expect(manager.hasPrefix("a")).toBe(true);
      expect(manager.hasPrefix("a.b")).toBe(true);
      expect(manager.hasPrefix("a.b.c")).toBe(true);
      expect(manager.hasPrefix("a.b.c.d")).toBe(true);
      expect(manager.hasPrefix("a.b.c.d.e")).toBe(true);
      expect(manager.hasPrefix("a.b.c.d.e.f")).toBe(false);
    });
  });

  describe("Prefix Activation", () => {
    it("should activate a prefix", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.activatePrefix("colors");
      // Activation should succeed without error
      expect(manager.hasPrefix("colors")).toBe(true);
    });

    it("should not activate prefix if no tokens in it", () => {
      manager.activatePrefix("nonexistent");
      // Should handle gracefully
      expect(manager.hasPrefix("nonexistent")).toBe(false);
    });

    it("should handle multiple activations idempotently", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.activatePrefix("colors");
      manager.activatePrefix("colors");
      // Should work without issues
      expect(manager.hasPrefix("colors")).toBe(true);
    });
  });

  describe("Token Resolution Tracking", () => {
    it("should mark token as resolved and return ready prefixes", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");
      manager.activatePrefix("colors");

      const ready = manager.markTokenResolved("colors.primary");
      expect(ready.length).toBe(0);
      expect(ready).not.toContain("colors");

      const ready2 = manager.markTokenResolved("colors.secondary");
      expect(ready2).toContain("colors");
    });

    it("should return empty array for token without prefixes", () => {
      const ready = manager.markTokenResolved("simpleToken");
      expect(ready.length).toBe(0);
    });

    it("should return empty array if prefix not activated", () => {
      manager.addTokenToPrefix("colors.primary");
      const ready = manager.markTokenResolved("colors.primary");
      expect(ready.length).toBe(0);
    });

    it("should handle multiple tokens in same prefix", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");
      manager.addTokenToPrefix("colors.tertiary");
      manager.activatePrefix("colors");

      const ready1 = manager.markTokenResolved("colors.primary");
      expect(ready1.length).toBe(0);

      const ready2 = manager.markTokenResolved("colors.secondary");
      expect(ready2.length).toBe(0);

      const ready3 = manager.markTokenResolved("colors.tertiary");
      expect(ready3).toContain("colors");
    });

    it("should clean up token prefixes after marking resolved", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.activatePrefix("colors");

      manager.markTokenResolved("colors.primary");

      const ready2 = manager.markTokenResolved("colors.primary");
      expect(ready2.length).toBe(0);
    });
  });

  describe("Dictionary Building", () => {
    it("should build dictionary from resolved tokens", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");

      const referenceCache = new Map<string, InterpreterResult>([
        ["colors.primary", new StringSymbol("#FF0000")],
        ["colors.secondary", new StringSymbol("#00FF00")],
      ]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict).not.toBeUndefined();
      expect(dict?.value?.has("primary")).toBe(true);
      expect(dict?.value?.has("secondary")).toBe(true);
    });

    it("should not include nested tokens in dictionary", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.primary.dark");

      const referenceCache = new Map<string, InterpreterResult>([
        ["colors.primary", new StringSymbol("#FF0000")],
        ["colors.primary.dark", new StringSymbol("#880000")],
      ]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict?.value?.has("primary")).toBe(true);
      expect(dict?.value?.has("primary.dark")).toBe(false);
    });

    it("should return undefined for nonexistent prefix", () => {
      const referenceCache = new Map<string, InterpreterResult>();
      const dict = manager.buildPrefixDictionary("nonexistent", referenceCache);
      expect(dict).toBeUndefined();
    });

    it("should return undefined for prefix with no resolved tokens", () => {
      manager.addTokenToPrefix("colors.primary");
      const referenceCache = new Map<string, InterpreterResult>();
      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict).toBeUndefined();
    });

    it("should handle null values in cache", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");

      const referenceCache = new Map<string, InterpreterResult>([
        ["colors.primary", null],
        ["colors.secondary", new StringSymbol("#00FF00")],
      ]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict?.value?.has("primary")).toBe(true);
      expect(dict?.value?.has("secondary")).toBe(true);
    });

    it("should convert non-symbol values to StringSymbol", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");

      const referenceCache = new Map<string, InterpreterResult>([
        ["colors.primary", "#FF0000"],
        ["colors.secondary", 123],
      ]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict?.value?.has("primary")).toBe(true);
      expect(dict?.value?.has("secondary")).toBe(true);
    });

    it("should include symbols in dictionary", () => {
      manager.addTokenToPrefix("colors.primary");

      const symbol = new StringSymbol("#FF0000");
      const referenceCache = new Map<string, InterpreterResult>([["colors.primary", symbol]]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      const entry = dict?.value?.get("primary");
      expect(entry).toBeDefined();
      expect(entry instanceof StringSymbol).toBe(true);
    });
  });

  describe("Virtual Children", () => {
    it("should add virtual child relationship", () => {
      manager.addVirtualChild("theme.colors", "theme.colors.primary");
      const children = manager.getVirtualChildren("theme.colors");
      expect(children.has("theme.colors.primary")).toBe(true);
    });

    it("should track multiple virtual children", () => {
      manager.addVirtualChild("colors", "colors.primary");
      manager.addVirtualChild("colors", "colors.secondary");
      manager.addVirtualChild("colors", "colors.tertiary");

      const children = manager.getVirtualChildren("colors");
      expect(children.size).toBe(3);
      expect(children.has("colors.primary")).toBe(true);
      expect(children.has("colors.secondary")).toBe(true);
      expect(children.has("colors.tertiary")).toBe(true);
    });

    it("should return empty set for parent with no virtual children", () => {
      const children = manager.getVirtualChildren("nonexistent");
      expect(children.size).toBe(0);
    });

    it("should prevent external mutation of virtual children set", () => {
      manager.addVirtualChild("colors", "colors.primary");
      const children = manager.getVirtualChildren("colors");
      expect(children.size).toBe(1);
      children.add("colors.secondary");

      const childrenAgain = manager.getVirtualChildren("colors");
      expect(childrenAgain.size).toBe(1);
      expect(childrenAgain.has("colors.secondary")).toBe(false);
    });

    it("should remove virtual children", () => {
      manager.addVirtualChild("colors", "colors.primary");
      manager.addVirtualChild("colors", "colors.secondary");

      manager.removeVirtualChildren("colors");

      const children = manager.getVirtualChildren("colors");
      expect(children.size).toBe(0);
    });
  });

  describe("Parent Token Finding", () => {
    it("should find immediate parent token", () => {
      const tokens = new Map([["colors", "value"]]);
      const parent = manager.findParentToken("colors.primary", tokens);
      expect(parent).toBe("colors");
    });

    it("should find parent in nested structure", () => {
      const tokens = new Map([
        ["theme", "value"],
        ["theme.colors", "value"],
      ]);
      const parent = manager.findParentToken("theme.colors.primary", tokens);
      expect(parent).toBe("theme.colors");
    });

    it("should find highest level parent when intermediate levels don't exist", () => {
      const tokens = new Map([["theme", "value"]]);
      const parent = manager.findParentToken("theme.colors.primary", tokens);
      expect(parent).toBe("theme");
    });

    it("should return undefined when no parent exists", () => {
      const tokens = new Map([["other", "value"]]);
      const parent = manager.findParentToken("colors.primary", tokens);
      expect(parent).toBeUndefined();
    });

    it("should return undefined for token with no dots", () => {
      const tokens = new Map([["colors", "value"]]);
      const parent = manager.findParentToken("simpleToken", tokens);
      expect(parent).toBeUndefined();
    });

    it("should handle deeply nested references", () => {
      const tokens = new Map([
        ["a", "value"],
        ["a.b", "value"],
        ["a.b.c", "value"],
        ["a.b.c.d", "value"],
      ]);
      const parent = manager.findParentToken("a.b.c.d.e.f.g", tokens);
      expect(parent).toBe("a.b.c.d");
    });
  });

  describe("Symbol Type Checking", () => {
    it("should handle ISymbolType objects", () => {
      manager.addTokenToPrefix("colors.primary");

      const symbol = new StringSymbol("#FF0000");
      const referenceCache = new Map<string, InterpreterResult>([["colors.primary", symbol]]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict?.value?.has("primary")).toBe(true);
    });

    it("should handle null values", () => {
      manager.addTokenToPrefix("colors.null");

      const referenceCache = new Map<string, InterpreterResult>([["colors.null", null]]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict?.value?.has("null")).toBe(true);
    });

    it("should handle undefined values by skipping them", () => {
      manager.addTokenToPrefix("colors.primary");

      const referenceCache = new Map<string, InterpreterResult>();
      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict).toBeUndefined();
    });

    it("should convert strings to StringSymbol", () => {
      manager.addTokenToPrefix("colors.primary");

      const referenceCache = new Map<string, InterpreterResult>([["colors.primary", "#FF0000"]]);

      const dict = manager.buildPrefixDictionary("colors", referenceCache);
      expect(dict?.value?.has("primary")).toBe(true);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple prefixes", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("spacing.small");
      manager.addTokenToPrefix("typography.heading");

      expect(manager.hasPrefix("colors")).toBe(true);
      expect(manager.hasPrefix("spacing")).toBe(true);
      expect(manager.hasPrefix("typography")).toBe(true);
    });

    it("should build dictionaries for multiple prefixes", () => {
      const referenceCache = new Map<string, InterpreterResult>([
        ["colors.primary", new StringSymbol("#FF0000")],
        ["colors.secondary", new StringSymbol("#00FF00")],
        ["spacing.small", new StringSymbol("4px")],
        ["spacing.large", new StringSymbol("8px")],
      ]);

      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");
      manager.addTokenToPrefix("spacing.small");
      manager.addTokenToPrefix("spacing.large");

      const colorDict = manager.buildPrefixDictionary("colors", referenceCache);
      const spacingDict = manager.buildPrefixDictionary("spacing", referenceCache);

      expect(colorDict?.value?.size).toBe(2);
      expect(spacingDict?.value?.size).toBe(2);
    });

    it("should handle token resolution across multiple prefixes", () => {
      manager.addTokenToPrefix("colors.primary");
      manager.addTokenToPrefix("colors.secondary");
      manager.addTokenToPrefix("spacing.small");
      manager.activatePrefix("colors");
      manager.activatePrefix("spacing");

      const colorsReady1 = manager.markTokenResolved("colors.primary");
      expect(colorsReady1.length).toBe(0);

      const colorsReady2 = manager.markTokenResolved("colors.secondary");
      expect(colorsReady2).toContain("colors");

      const spacingReady = manager.markTokenResolved("spacing.small");
      expect(spacingReady).toContain("spacing");
    });
  });
});
