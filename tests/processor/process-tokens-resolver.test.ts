import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

/**
 * Tests that verify the resolver from processTokens output can be used directly
 * for CRUD operations without needing to call build() again.
 */
describe("processTokens resolver flow", () => {
  it("should use resolver from processTokens output directly for updateToken", () => {
    const tokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "{color.primary}", $type: "color" }],
      ["spacing.base", { $value: "8", $type: "dimension" }],
    ]);

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Call .updateToken directly on that resolver without build
    const updateResult = resolver.updateToken({
      tokenPath: "color.primary",
      tokenData: { $value: "#0000FF", $type: "color" },
    });

    // Verify update worked
    expect(updateResult.resolvedValue.toString()).toBe("#0000FF");
    expect(updateResult.updated).toBe(true);
    expect(updateResult.affectedTokens.has("color.primary")).toBe(true);
    expect(updateResult.affectedTokens.has("color.secondary")).toBe(true);
  });

  it("should use resolver from processTokens output directly for createToken", () => {
    const tokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
    ]);

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Call .createToken directly on that resolver without build
    const createResult = resolver.createToken({
      tokenPath: "color.secondary",
      tokenData: { $value: "{color.primary}", $type: "color" },
    });

    // Verify create worked
    expect(createResult.resolvedValue.toString()).toBe("#FF0000");
    expect(createResult.created).toBe(true);
    expect(createResult.affectedTokens.has("color.secondary")).toBe(true);
  });

  it("should use resolver from processTokens output directly for deleteToken", () => {
    const tokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "{color.primary}", $type: "color" }],
    ]);

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Call .deleteToken directly on that resolver without build
    const deleteResult = resolver.deleteToken({
      tokenPath: "color.primary",
    });

    // Verify delete worked
    expect(deleteResult.affectedTokens.has("color.secondary")).toBe(true);
    expect(deleteResult.brokenReferences?.has("color.secondary")).toBe(true);
  });

  it("should handle multiple updateToken calls in sequence", () => {
    const tokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base} * 2", $type: "dimension" }],
      ["furtherDerived", { $value: "{derived} + 5", $type: "dimension" }],
    ]);

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Multiple updateToken calls directly on that resolver without build
    const firstUpdate = resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "20", $type: "dimension" },
    });

    expect(firstUpdate.resolvedValue.toString()).toBe("20");
    expect(firstUpdate.affectedTokens.has("base")).toBe(true);
    expect(firstUpdate.affectedTokens.has("derived")).toBe(true);
    expect(firstUpdate.affectedTokens.has("furtherDerived")).toBe(true);

    // Second update
    const secondUpdate = resolver.updateToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * 3", $type: "dimension" },
    });

    expect(secondUpdate.resolvedValue.toString()).toBe("60");
    expect(secondUpdate.affectedTokens.has("derived")).toBe(true);
    expect(secondUpdate.affectedTokens.has("furtherDerived")).toBe(true);
  });

  it("should handle updateToken with reference updates", () => {
    const tokens = new Map<string, TokenData>([
      ["color.old", { $value: "#FF0000", $type: "color" }],
      ["button.bg", { $value: "{color.old}", $type: "color" }],
      ["card.bg", { $value: "{color.old}", $type: "color" }],
    ]);

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Rename token with updateReferences
    const updateResult = resolver.updateToken({
      tokenPath: "color.old",
      tokenData: { $value: "#0000FF", $type: "color" },
      tokenPathRenamed: "color.new",
      updateReferences: true,
    });

    // Verify rename worked
    expect(updateResult.resolvedValue.toString()).toBe("#0000FF");
    expect(updateResult.updated).toBe(true);
    expect(updateResult.renamedReferences?.has("button.bg")).toBe(true);
    expect(updateResult.renamedReferences?.has("card.bg")).toBe(true);
  });

  it("should work with Map<string, string> input", () => {
    const tokens = new Map<string, string>([
      ["color.primary", "#FF0000"],
      ["color.secondary", "{color.primary}"],
    ]);

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Call .updateToken directly on that resolver without build
    const updateResult = resolver.updateToken({
      tokenPath: "color.primary",
      tokenData: { $value: "#00FF00", $type: "color" },
    });

    // Verify update worked
    expect(updateResult.resolvedValue.toString()).toBe("#00FF00");
    expect(updateResult.affectedTokens.has("color.primary")).toBe(true);
    expect(updateResult.affectedTokens.has("color.secondary")).toBe(true);
  });

  it("should work with Record<string, any> input", () => {
    const tokens = {
      "color.primary": "#FF0000",
      "color.secondary": "{color.primary}",
    };

    // Step 1: processTokens
    const result = processTokens(tokens);

    // Step 2: Take .resolver from result
    const { resolver } = result;

    // Step 3: Call .createToken directly on that resolver without build
    const createResult = resolver.createToken({
      tokenPath: "color.tertiary",
      tokenData: { $value: "{color.primary}", $type: "color" },
    });

    // Verify create worked
    expect(createResult.resolvedValue.toString()).toBe("#FF0000");
    expect(createResult.created).toBe(true);
  });
});
