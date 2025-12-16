import { processTokens } from "@src/processor/process";
import { getAffectedTokens, getBrokenReferences } from "@src/processor/resolver/helpers";
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
    expect(updateResult.resolved?.toString()).toBe("#0000FF");
    expect(updateResult.updated).toBe(true);
    const affectedTokens = getAffectedTokens(updateResult);
    expect(affectedTokens.has("color.primary")).toBe(true);
    expect(affectedTokens.has("color.secondary")).toBe(true);
  });

  it("should use resolver from processTokens output directly for createToken", () => {
    const tokens = new Map<string, TokenData>([["color.primary", { $value: "#FF0000", $type: "color" }]]);

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
    expect(createResult.resolved?.toString()).toBe("#FF0000");
    expect(createResult.created).toBe(true);
    expect(getAffectedTokens(createResult).has("color.secondary")).toBe(true);
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
    expect(getAffectedTokens(deleteResult).has("color.secondary")).toBe(true);
    expect(getBrokenReferences(deleteResult).has("color.secondary")).toBe(true);
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

    const firstAffected = getAffectedTokens(firstUpdate);
    expect(firstUpdate.resolved?.toString()).toBe("20");
    expect(firstAffected.has("base")).toBe(true);
    expect(firstAffected.has("derived")).toBe(true);
    expect(firstAffected.has("furtherDerived")).toBe(true);

    // Second update
    const secondUpdate = resolver.updateToken({
      tokenPath: "derived",
      tokenData: { $value: "{base} * 3", $type: "dimension" },
    });

    const secondAffected = getAffectedTokens(secondUpdate);
    expect(secondUpdate.resolved?.toString()).toBe("60");
    expect(secondAffected.has("derived")).toBe(true);
    expect(secondAffected.has("furtherDerived")).toBe(true);
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
    expect(updateResult.resolved?.toString()).toBe("#0000FF");
    expect(updateResult.updated).toBe(true);
    // Reference updates are tracked in the tokens map now, not as a separate field
    expect(updateResult.tokens.has("button.bg")).toBe(true);
    expect(updateResult.tokens.has("card.bg")).toBe(true);
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
    const affectedTokens = getAffectedTokens(updateResult);
    expect(updateResult.resolved?.toString()).toBe("#00FF00");
    expect(affectedTokens.has("color.primary")).toBe(true);
    expect(affectedTokens.has("color.secondary")).toBe(true);
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
    expect(createResult.resolved?.toString()).toBe("#FF0000");
    expect(createResult.created).toBe(true);
  });
});
