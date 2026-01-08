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

  it("should use validations script", () => {
    const manager = new TokenManager();
    const spec = {
      name: "border-radius",
      type: "token" as const,
      schema: {
        type: "object" as const,
        properties: {
          value: {
            type: "number" as const,
          },
          validations: {
            script: "Enter script here",
          },
        },
      },
    };
    manager.register("test-uri", JSON.stringify(spec));
    expect(manager.getSpec("test-uri")).toEqual(spec);
  });
});
