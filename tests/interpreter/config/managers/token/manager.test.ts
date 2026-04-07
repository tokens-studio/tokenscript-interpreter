import { TokenManager } from "@interpreter/config/managers/token/manager";
import { describe, expect, it } from "vitest";

describe("TokenManager", () => {
  it("should register a token spec", () => {
    const manager = new TokenManager();
    const spec = {
      name: "TestToken",
      type: "token" as const,
      schema: {
        type: "object" as const,
        properties: {
          value: {
            type: "number" as const,
          },
        },
      },
    };
    manager.register("test-uri", spec);
    expect(manager.getSpec("test-uri")).toEqual(spec);
    expect(manager.getSpecByType("testtoken")).toEqual(spec);
  });

  it("should register a token spec from string", () => {
    const manager = new TokenManager();
    const spec = {
      name: "TestToken",
      type: "token" as const,
      schema: {
        type: "object" as const,
        properties: {
          value: {
            type: "number" as const,
          },
        },
      },
    };
    manager.register("test-uri", JSON.stringify(spec));
    expect(manager.getSpec("test-uri")).toEqual(spec);
  });

  it("should throw error for invalid spec", () => {
    const manager = new TokenManager();
    expect(() => manager.register("test-uri", "invalid json")).toThrow();
    expect(() => manager.register("test-uri", JSON.stringify({ name: "Invalid" }))).toThrow();
  });

  it("should clone correctly", () => {
    const manager = new TokenManager();
    const spec = {
      name: "TestToken",
      type: "token" as const,
    };
    manager.register("test-uri", spec);
    const clone = manager.clone();
    expect(clone.getSpec("test-uri")).toEqual(spec);
    expect(clone).not.toBe(manager);
  });

  it("should accept a per-property validations map on the schema", () => {
    const manager = new TokenManager();
    // `validations` is a sibling field on Schema, keyed by sub-property
    // name; it is NOT a property entry of its own. The previous version
    // of this test put `validations: { script: "..." }` inside
    // `properties`, which the old loose `Record<string, unknown>` shape
    // silently accepted but the strict shape correctly rejects (no
    // `type` field on the would-be Property).
    const spec = {
      name: "border-radius",
      type: "token" as const,
      schema: {
        type: "object" as const,
        properties: {
          value: {
            type: "number" as const,
          },
        },
        validations: {
          value: "Enter script here",
        },
      },
    };
    manager.register("test-uri", JSON.stringify(spec));
    expect(manager.getSpec("test-uri")).toEqual(spec);
  });
});
