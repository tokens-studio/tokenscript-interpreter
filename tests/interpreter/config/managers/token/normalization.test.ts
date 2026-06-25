import { TokenManager } from "@interpreter/config/managers/token/manager";
import { NumberSymbol, NumberWithUnitSymbol, StringSymbol } from "@interpreter/symbols";
import { beforeEach, describe, expect, it } from "vitest";

// Duration normalization script — mirrors tokenscript/registry/types/tokens/duration/0/normalization.tokenscript
const durationNormalizationScript = `
if (is_number({input})) [
  return ({input})ms;
];

if (type({input}) == "s") [
  return (({input}.value) * 1000)ms;
];

return {input};
`;

const durationSchema = {
  name: "duration",
  type: "token",
  description: "A duration value (ms or s).",
  validation: {
    type: "tokenscript",
    script: `return true;`,
  },
  normalization: {
    type: "tokenscript",
    script: durationNormalizationScript,
  },
};

describe("TokenManager.normalize", () => {
  let manager: TokenManager;

  beforeEach(() => {
    manager = new TokenManager();
    manager.register("types/tokens/duration/0", durationSchema);
  });

  it("normalizes bare number to ms", () => {
    const input = new NumberSymbol(300);
    const result = manager.normalize("duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).value).toBe(300);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
    expect(result.toString()).toBe("300ms");
  });

  it("normalizes zero to 0ms", () => {
    const input = new NumberSymbol(0);
    const result = manager.normalize("duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).value).toBe(0);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
  });

  it("normalizes decimal to ms", () => {
    const input = new NumberSymbol(16.5);
    const result = manager.normalize("duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).value).toBe(16.5);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
  });

  it("converts seconds to ms", () => {
    const input = new NumberWithUnitSymbol(0.5, "s");
    const result = manager.normalize("duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).value).toBe(500);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
  });

  it("passes through ms values unchanged", () => {
    const input = new NumberWithUnitSymbol(200, "ms");
    const result = manager.normalize("duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).value).toBe(200);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
  });

  it("returns original value when no normalization script registered", () => {
    const input = new StringSymbol("hello");
    const result = manager.normalize("color", input);

    expect(result).toBe(input);
  });

  it("is case-insensitive for token type", () => {
    const input = new NumberSymbol(42);
    const result = manager.normalize("Duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
  });

  it("auto-registers normalization from spec", () => {
    // Normalization was registered via register(), verify it's callable
    expect(manager.getNormalization("duration")).toBeDefined();
    expect(manager.getNormalization("color")).toBeUndefined();
  });
});

describe("TokenManager.registerNormalization", () => {
  it("accepts string script directly", () => {
    const manager = new TokenManager();
    manager.registerNormalization("test", "return ({input})px;");

    expect(manager.getNormalization("test")).toBe("return ({input})px;");
  });

  it("accepts object with type and script", () => {
    const manager = new TokenManager();
    manager.registerNormalization("test", {
      type: "tokenscript",
      script: "return ({input})px;",
    });

    expect(manager.getNormalization("test")).toBe("return ({input})px;");
  });
});

describe("TokenManager.clone normalization", () => {
  it("preserves normalization scripts across clone", () => {
    const manager = new TokenManager();
    manager.register("types/tokens/duration/0", durationSchema);

    const cloned = manager.clone();
    const input = new NumberSymbol(100);
    const result = cloned.normalize("duration", input);

    expect(result).toBeInstanceOf(NumberWithUnitSymbol);
    expect((result as NumberWithUnitSymbol).value).toBe(100);
    expect((result as NumberWithUnitSymbol).unit).toBe("ms");
  });
});

// Integration: normalization through processTokens pipeline
import { Config } from "@interpreter/config";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import type { InterpreterResult } from "@src/types";

function makeDurationConfig(): Config {
  const config = new Config();
  config.tokenManager.register("types/tokens/duration/0", durationSchema);
  return config;
}

describe("processTokens normalization integration", () => {
  it("normalizes bare duration in resolved output", () => {
    const tokens = new Map<string, TokenData>([
      ["timing.fast", { $value: "200", $type: "duration" }],
    ]);
    const result = processTokens(tokens, { config: makeDurationConfig() });
    const output = result.output as Map<string, string | InterpreterResult>;
    expect(output.get("timing.fast")?.toString()).toBe("200ms");
  });

  it("normalizes seconds to ms in resolved output", () => {
    const tokens = new Map<string, TokenData>([
      ["timing.slow", { $value: "0.5s", $type: "duration" }],
    ]);
    const result = processTokens(tokens, { config: makeDurationConfig() });
    const output = result.output as Map<string, string | InterpreterResult>;
    expect(output.get("timing.slow")?.toString()).toBe("500ms");
  });

  it("passes through ms values in resolved output", () => {
    const tokens = new Map<string, TokenData>([
      ["timing.normal", { $value: "300ms", $type: "duration" }],
    ]);
    const result = processTokens(tokens, { config: makeDurationConfig() });
    const output = result.output as Map<string, string | InterpreterResult>;
    expect(output.get("timing.normal")?.toString()).toBe("300ms");
  });

  it("normalizes referenced duration values", () => {
    const tokens = new Map<string, TokenData>([
      ["timing.base", { $value: "100", $type: "duration" }],
      ["timing.ref", { $value: "{timing.base}", $type: "duration" }],
    ]);
    const result = processTokens(tokens, { config: makeDurationConfig() });
    const output = result.output as Map<string, string | InterpreterResult>;
    expect(output.get("timing.base")?.toString()).toBe("100ms");
    expect(output.get("timing.ref")?.toString()).toBe("100ms");
  });

  it("normalizes in resolveValue for form preview", () => {
    const tokens = new Map<string, TokenData>([
      ["timing.base", { $value: "200", $type: "duration" }],
    ]);
    const result = processTokens(tokens, { config: makeDurationConfig() });
    const preview = result.resolver.resolveValue({ value: "42", type: "duration" });
    expect(preview.resolved?.toString()).toBe("42ms");
  });

  it("does not normalize tokens without $type", () => {
    const tokens = new Map<string, TokenData>([
      ["generic", { $value: "200" }],
    ]);
    const result = processTokens(tokens, { config: makeDurationConfig() });
    const output = result.output as Map<string, string | InterpreterResult>;
    expect(output.get("generic")?.toString()).toBe("200");
  });
});
