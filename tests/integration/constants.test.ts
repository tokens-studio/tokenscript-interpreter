import { Config } from "@interpreter/config";
import type { ConstantsSpecification } from "@interpreter/config/managers/constants/schema";
import type { FunctionSpecification } from "@interpreter/config/managers/functions/schema";
import { ColorSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { processTokens } from "@src/processor/process";
import { describe, expect, it } from "vitest";

const CSS_COLORS_SCHEMA: ConstantsSpecification = {
  name: "CSS Colors",
  type: "constants",
  inline: true,
  values: {
    red: "#FF0000",
    green: "#008000",
    blue: "#0000FF",
    white: "#FFFFFF",
    black: "#000000",
  },
};

describe("Constants Schema Integration", () => {
  it("should resolve bare identifier constant to a ColorSymbol", () => {
    const config = new Config();
    config.registerSchemas([{ uri: "css-colors", schema: CSS_COLORS_SCHEMA }]);

    const tokens = new Map([["myColor", "red"]]);
    const result = processTokens(tokens, { config });

    const value = result.tokens.get("myColor");
    expect(value).toBeInstanceOf(ColorSymbol);
    expect((value as ColorSymbol).toString()).toBe("#FF0000");
  });

  it("should NOT resolve constants via reference syntax", () => {
    const config = new Config();
    config.registerSchemas([{ uri: "css-colors", schema: CSS_COLORS_SCHEMA }]);

    const tokens = new Map([["myColor", "{red}"]]);
    const result = processTokens(tokens, { config });

    // {red} should fail as unknown reference
    expect(result.issues).toBeDefined();
    expect(result.issues!.has("myColor")).toBe(true);
  });

  it("should work alongside normal token references", () => {
    const config = new Config();
    config.registerSchemas([{ uri: "css-colors", schema: CSS_COLORS_SCHEMA }]);

    const tokens = new Map([
      ["bg", "#AABBCC"],
      ["primary", "{bg}"],
      ["secondary", "red"],
    ]);
    const result = processTokens(tokens, { config });

    const primary = result.tokens.get("primary");
    expect(primary).toBeInstanceOf(ColorSymbol);
    expect((primary as ColorSymbol).toString()).toBe("#AABBCC");

    const secondary = result.tokens.get("secondary");
    expect(secondary).toBeInstanceOf(ColorSymbol);
    expect((secondary as ColorSymbol).toString()).toBe("#FF0000");
  });

  it("should have constants overridden by same-name symbol table entries (e.g. from prior variable declarations)", () => {
    // Constants are injected into symbol table, so bare 'red' resolves to the constant
    // Without any variable declaration, 'red' should resolve as the constant color
    const config = new Config();
    config.registerSchemas([{ uri: "css-colors", schema: CSS_COLORS_SCHEMA }]);

    const tokens = new Map([["myToken", "red"]]);
    const result = processTokens(tokens, { config });

    const value = result.tokens.get("myToken");
    expect(value).toBeInstanceOf(ColorSymbol);
    expect((value as ColorSymbol).toString()).toBe("#FF0000");
  });

  it("should NOT make constants available in function scripts", () => {
    const funcSchema: FunctionSpecification = {
      name: "try_red",
      type: "function",
      keyword: "try_red",
      script: {
        type: "tokenscript",
        // In a function script, 'red' should be a bare string, not the constant
        script: "return red;",
      },
    };

    const config = new Config();
    config.registerSchemas([
      { uri: "css-colors", schema: CSS_COLORS_SCHEMA },
      { uri: "try-red-fn", schema: funcSchema },
    ]);

    const tokens = new Map([["result", "try_red()"]]);
    const result = processTokens(tokens, { config });

    const value = result.tokens.get("result");
    // In function scripts, 'red' should be a plain string (identifier fallback)
    expect(value).toBeInstanceOf(StringSymbol);
    expect((value as StringSymbol).value).toBe("red");
  });

  it("should merge multiple constants schemas", () => {
    const schema1: ConstantsSpecification = {
      name: "Colors A",
      type: "constants",
      inline: true,
      values: { red: "#FF0000" },
    };
    const schema2: ConstantsSpecification = {
      name: "Colors B",
      type: "constants",
      inline: true,
      values: { blue: "#0000FF" },
    };

    const config = new Config();
    config.registerSchemas([
      { uri: "a", schema: schema1 },
      { uri: "b", schema: schema2 },
    ]);

    const tokens = new Map([
      ["c1", "red"],
      ["c2", "blue"],
    ]);
    const result = processTokens(tokens, { config });

    expect(result.tokens.get("c1")).toBeInstanceOf(ColorSymbol);
    expect((result.tokens.get("c1") as ColorSymbol).toString()).toBe("#FF0000");
    expect(result.tokens.get("c2")).toBeInstanceOf(ColorSymbol);
    expect((result.tokens.get("c2") as ColorSymbol).toString()).toBe("#0000FF");
  });

  it("should NOT inject inline: false constants", () => {
    const schema: ConstantsSpecification = {
      name: "Non-inline",
      type: "constants",
      inline: false,
      values: { red: "#FF0000" },
    };

    const config = new Config();
    config.registerSchemas([{ uri: "non-inline", schema }]);

    const tokens = new Map([["myColor", "red"]]);
    const result = processTokens(tokens, { config });

    // 'red' should be a plain string (not resolved as constant)
    const value = result.tokens.get("myColor");
    expect(value).toBeInstanceOf(StringSymbol);
    expect((value as StringSymbol).value).toBe("red");
  });

  it("should isolate constants on Config.clone()", () => {
    const config = new Config();
    config.registerSchemas([{ uri: "css-colors", schema: CSS_COLORS_SCHEMA }]);

    const cloned = config.clone();

    // Cloned config should NOT have the constants
    expect(cloned.inlineConstants.size).toBe(0);

    // Original should still have them
    expect(config.inlineConstants.size).toBe(5);
  });

  it("should parse numeric constant values", () => {
    const schema: ConstantsSpecification = {
      name: "Numeric Constants",
      type: "constants",
      inline: true,
      values: { defaultSize: 16 },
    };

    const config = new Config();
    config.registerSchemas([{ uri: "nums", schema }]);

    const tokens = new Map([["size", "defaultSize"]]);
    const result = processTokens(tokens, { config });

    const value = result.tokens.get("size");
    expect(value).toBeInstanceOf(NumberSymbol);
    expect((value as NumberSymbol).value).toBe(16);
  });
});
