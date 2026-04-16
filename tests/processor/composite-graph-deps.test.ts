import { TokenResolver } from "@src/processor";
import { describe, expect, it } from "vitest";

/**
 * These tests cover the bug where composite tokens (typography, shadow, border,
 * gradient) did not expose their sub-field reference targets on the parent node
 * of the dependency graph. Consumers that read `graph.getNodes().get(parent)`
 * (for example, a "referenced tokens" panel in a design-tool UI) need to see
 * the concrete token names that the parent transitively depends on, not the
 * internal sub-field paths used during resolution.
 *
 * The fix makes the parent's dependency set include every reference reached by
 * walking the structured value recursively — regardless of nesting depth and
 * regardless of whether the sub-field value is a single `{ref}` string or an
 * expression containing multiple refs.
 */
describe("TokenResolver dependency graph - composite sub-field references", () => {
  it("records every sub-field reference on the parent typography node", () => {
    const processor = new TokenResolver();
    const tokens = new Map([
      ["fontFamilies.sans", { $value: "Inter" }],
      ["dims.lg", { $value: "24" }],
      [
        "typography.heading",
        {
          $type: "typography",
          $value: {
            fontFamily: "{fontFamilies.sans}",
            fontSize: "{dims.lg}",
            fontWeight: "700",
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("typography.heading");
    expect(deps).toBeDefined();
    expect(deps?.has("fontFamilies.sans")).toBe(true);
    expect(deps?.has("dims.lg")).toBe(true);
  });

  it("records refs from nested object sub-fields (border)", () => {
    const processor = new TokenResolver();
    const tokens = new Map([
      ["color.border", { $value: "#000" }],
      ["dims.border", { $value: "2" }],
      [
        "border.default",
        {
          $type: "border",
          $value: {
            color: "{color.border}",
            width: "{dims.border}",
            style: "solid",
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("border.default");
    expect(deps).toBeDefined();
    expect(deps?.has("color.border")).toBe(true);
    expect(deps?.has("dims.border")).toBe(true);
  });

  it("records refs from array-of-object sub-fields (shadow)", () => {
    const processor = new TokenResolver();
    const tokens = new Map([
      ["color.shadow", { $value: "rgba(0,0,0,0.2)" }],
      ["dims.blur", { $value: "16" }],
      ["dims.offset", { $value: "4" }],
      [
        "shadow.card",
        {
          $type: "shadow",
          $value: [
            {
              color: "{color.shadow}",
              offsetX: "0",
              offsetY: "{dims.offset}",
              blur: "{dims.blur}",
              spread: "0",
            },
          ],
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("shadow.card");
    expect(deps).toBeDefined();
    expect(deps?.has("color.shadow")).toBe(true);
    expect(deps?.has("dims.offset")).toBe(true);
    expect(deps?.has("dims.blur")).toBe(true);
  });

  it("records both refs when a sub-field value is an expression with multiple refs", () => {
    const processor = new TokenResolver();
    const tokens = new Map([
      ["dims.base", { $value: "8" }],
      ["dims.gap", { $value: "4" }],
      [
        "typography.body",
        {
          $type: "typography",
          $value: {
            fontSize: "{dims.base} + {dims.gap}",
            fontFamily: "Inter",
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("typography.body");
    expect(deps).toBeDefined();
    expect(deps?.has("dims.base")).toBe(true);
    expect(deps?.has("dims.gap")).toBe(true);
  });

  it("still reports multiple refs from a top-level expression value", () => {
    // Sanity-check parity with the composite case — ensures regular tokens
    // already pick up every ref in an expression (they do; this guards against
    // regressions in the non-composite path).
    const processor = new TokenResolver();
    const tokens = new Map([
      ["dims.base", { $value: "8" }],
      ["dims.gap", { $value: "4" }],
      ["dims.sum", { $value: "{dims.base} + {dims.gap}" }],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("dims.sum");
    expect(deps).toBeDefined();
    expect(deps?.has("dims.base")).toBe(true);
    expect(deps?.has("dims.gap")).toBe(true);
  });

  it("deduplicates refs that appear in multiple sub-fields", () => {
    const processor = new TokenResolver();
    const tokens = new Map([
      ["dims.unit", { $value: "8" }],
      [
        "spacing.pair",
        {
          $type: "dimension",
          $value: {
            top: "{dims.unit}",
            bottom: "{dims.unit}",
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("spacing.pair");
    expect(deps).toBeDefined();
    expect(deps?.has("dims.unit")).toBe(true);
    // Set deduplication — one entry, not two.
    let dimsUnitCount = 0;
    for (const dep of deps ?? []) {
      if (dep === "dims.unit") dimsUnitCount += 1;
    }
    expect(dimsUnitCount).toBe(1);
  });

  it("records refs from deeply nested sub-fields", () => {
    const processor = new TokenResolver();
    const tokens = new Map([
      ["color.a", { $value: "#111" }],
      ["color.b", { $value: "#222" }],
      [
        "complex.token",
        {
          $type: "custom",
          $value: {
            outer: {
              inner: {
                color: "{color.a}",
              },
            },
            list: [{ color: "{color.b}" }],
          },
        },
      ],
    ]);

    const result = processor.processTokens(tokens);

    const deps = result.graph.getNodes().get("complex.token");
    expect(deps).toBeDefined();
    expect(deps?.has("color.a")).toBe(true);
    expect(deps?.has("color.b")).toBe(true);
  });
});
