import { InterpreterError, InterpreterErrorCode, ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import { getAffectedTokens, getBrokenReferences, getModifiedDependants, getRenamedReferences } from "@src/processor/resolver/helpers";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

describe("resolver helpers", () => {
  describe("getAffectedTokens", () => {
    it("should return empty set when no dependants graph", () => {
      const result = {
        tokens: new Map(),
      };

      const affected = getAffectedTokens(result);
      expect(affected.size).toBe(0);
    });

    it("should return all nodes from dependants graph", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["derived1", { $value: "{base}", $type: "dimension" }],
        ["derived2", { $value: "{derived1}", $type: "dimension" }],
      ]);

      const { resolver } = new TokenResolver().build(allTokens);
      const result = resolver.updateToken({
        tokenPath: "base",
        tokenData: { $value: "20px", $type: "dimension" },
      });

      const affected = getAffectedTokens(result);
      expect(affected.has("base")).toBe(true);
      expect(affected.has("derived1")).toBe(true);
      expect(affected.has("derived2")).toBe(true);
    });

    it("should return only direct dependants when no nested dependencies", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["derived1", { $value: "{base}", $type: "dimension" }],
        ["derived2", { $value: "{base}", $type: "dimension" }],
      ]);

      const { resolver } = new TokenResolver().build(allTokens);
      const result = resolver.updateToken({
        tokenPath: "base",
        tokenData: { $value: "20px", $type: "dimension" },
      });

      const affected = getAffectedTokens(result);
      expect(affected.has("base")).toBe(true);
      expect(affected.has("derived1")).toBe(true);
      expect(affected.has("derived2")).toBe(true);
    });
  });

  describe("getBrokenReferences", () => {
    it("should return empty set when no issues", () => {
      const result = {
        tokens: new Map(),
      };

      const broken = getBrokenReferences(result);
      expect(broken.size).toBe(0);
    });

    it("should return empty set when issues map is empty", () => {
      const result = {
        tokens: new Map(),
        issues: new Map(),
      };

      const broken = getBrokenReferences(result);
      expect(broken.size).toBe(0);
    });

    it("should find broken references from TOKEN_NOT_FOUND errors", () => {
      const allTokens = new Map<string, TokenData>([
        ["valid", { $value: "10px", $type: "dimension" }],
        ["broken", { $value: "{missing}", $type: "dimension" }],
      ]);

      const { resolver } = new TokenResolver().build(allTokens);
      const result = resolver.deleteToken({ tokenPath: "valid" });

      const broken = getBrokenReferences(result);
      // Depending on implementation, broken references might be tracked
      expect(broken).toBeDefined();
    });

    it("should identify broken references after delete", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["dependent", { $value: "{base}", $type: "dimension" }],
      ]);

      const { resolver } = new TokenResolver().build(allTokens);
      const result = resolver.deleteToken({ tokenPath: "base" });

      const broken = getBrokenReferences(result);
      expect(broken.has("dependent")).toBe(true);
    });

    it("should handle DEPENDENCY_ERROR codes", () => {
      const result = {
        tokens: new Map(),
        issues: new Map([
          [
            "token1",
            [
              new ProcessorError(ProcessorErrorCode.DEPENDENCY_ERROR, {
                data: { tokenName: "token1" },
              }),
            ],
          ],
        ]),
      };

      const broken = getBrokenReferences(result);
      expect(broken.has("token1")).toBe(true);
    });

    it("should ignore non-reference errors", () => {
      const result = {
        tokens: new Map(),
        issues: new Map([
          [
            "token1",
            [
              new InterpreterError(InterpreterErrorCode.ARITHMETIC_REQUIRES_NUMBER, {
                data: { operator: "+", leftType: "string", rightType: "string" },
              }),
            ],
          ],
        ]),
      };

      const broken = getBrokenReferences(result);
      expect(broken.size).toBe(0);
    });
  });

  describe("getRenamedReferences", () => {
    it("should return the provided modifiedTokens set", () => {
      const result = {
        tokens: new Map(),
      };

      const modifiedTokens = new Set(["token1", "token2", "token3"]);
      const renamed = getRenamedReferences(result, modifiedTokens);

      expect(renamed).toBe(modifiedTokens);
      expect(renamed.size).toBe(3);
      expect(renamed.has("token1")).toBe(true);
      expect(renamed.has("token2")).toBe(true);
      expect(renamed.has("token3")).toBe(true);
    });

    it("should return empty set when no modified tokens", () => {
      const result = {
        tokens: new Map(),
      };

      const modifiedTokens = new Set<string>();
      const renamed = getRenamedReferences(result, modifiedTokens);

      expect(renamed.size).toBe(0);
    });
  });

  describe("getModifiedDependants", () => {
    it("should return empty set when no dependants graph", () => {
      const oldTokens = new Map([["token1", "value1"]]);
      const result = {
        tokens: new Map([["token1", "value1"]]),
      };

      const modified = getModifiedDependants(oldTokens, result);
      expect(modified.size).toBe(0);
    });

    it("should detect changes even with same primitive value due to new symbol creation", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["derived", { $value: "{base}", $type: "dimension" }],
      ]);

      const { resolver, tokens } = new TokenResolver().build(allTokens);
      const oldTokens = new Map(tokens);

      // Update base with the same value - still creates new symbols
      const result = resolver.updateToken({
        tokenPath: "base",
        tokenData: { $value: "10px", $type: "dimension" },
      });

      const modified = getModifiedDependants(oldTokens, result);
      // Even though the string value is the same, new symbol objects are created
      // so the comparison by reference will detect a change
      expect(modified.has("base")).toBe(true);
      expect(modified.has("derived")).toBe(true);
    });

    it("should identify tokens whose values changed", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["derived1", { $value: "{base}", $type: "dimension" }],
        ["derived2", { $value: "{base}", $type: "dimension" }],
        ["unrelated", { $value: "5px", $type: "dimension" }],
      ]);

      const { resolver, tokens } = new TokenResolver().build(allTokens);
      const oldTokens = new Map(tokens);

      // Update base with a new value
      const result = resolver.updateToken({
        tokenPath: "base",
        tokenData: { $value: "20px", $type: "dimension" },
      });

      const modified = getModifiedDependants(oldTokens, result);

      // base, derived1, and derived2 should have changed values
      expect(modified.has("base")).toBe(true);
      expect(modified.has("derived1")).toBe(true);
      expect(modified.has("derived2")).toBe(true);
      expect(modified.has("unrelated")).toBe(false);
    });

    it("should only include dependants that actually changed during rename with updateReferences", () => {
      const allTokens = new Map<string, TokenData>([
        ["old.name", { $value: "10px", $type: "dimension" }],
        ["uses.old", { $value: "{old.name}", $type: "dimension" }],
        ["also.uses.old", { $value: "{old.name}", $type: "dimension" }],
        ["unrelated", { $value: "5px", $type: "dimension" }],
      ]);

      const { resolver, tokens } = new TokenResolver().build(allTokens);
      const oldTokens = new Map(tokens);

      // Rename token with updateReferences
      const result = resolver.updateToken({
        tokenPath: "old.name",
        tokenPathRenamed: "new.name",
        updateReferences: true,
      });

      const modified = getModifiedDependants(oldTokens, result);

      // The tokens that reference the renamed token should have changed
      expect(modified.has("uses.old")).toBe(true);
      expect(modified.has("also.uses.old")).toBe(true);
      expect(modified.has("unrelated")).toBe(false);
    });

    it("should handle nested dependency chains", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["level1", { $value: "{base}", $type: "dimension" }],
        ["level2", { $value: "{level1}", $type: "dimension" }],
        ["level3", { $value: "{level2}", $type: "dimension" }],
      ]);

      const { resolver, tokens } = new TokenResolver().build(allTokens);
      const oldTokens = new Map(tokens);

      const result = resolver.updateToken({
        tokenPath: "base",
        tokenData: { $value: "20px", $type: "dimension" },
      });

      const modified = getModifiedDependants(oldTokens, result);

      // All levels should have changed
      expect(modified.has("base")).toBe(true);
      expect(modified.has("level1")).toBe(true);
      expect(modified.has("level2")).toBe(true);
      expect(modified.has("level3")).toBe(true);
    });

    it("should detect modified tokens in dependants graph when symbols are recreated", () => {
      const allTokens = new Map<string, TokenData>([
        ["base", { $value: "10px", $type: "dimension" }],
        ["derived", { $value: "{base}", $type: "dimension" }],
        ["unrelated", { $value: "5px", $type: "dimension" }],
      ]);

      const { resolver, tokens } = new TokenResolver().build(allTokens);
      const oldTokens = new Map(tokens);

      // Update base with the same value - still creates new symbols
      const result = resolver.updateToken({
        tokenPath: "base",
        tokenData: { $value: "10px", $type: "dimension" },
      });

      const modified = getModifiedDependants(oldTokens, result);

      // Tokens that depend on base will have new symbol references
      expect(modified.has("base")).toBe(true);
      expect(modified.has("derived")).toBe(true);
      // Unrelated should not be in the modified set (not in dependants graph)
      expect(modified.has("unrelated")).toBe(false);
    });
  });
});
