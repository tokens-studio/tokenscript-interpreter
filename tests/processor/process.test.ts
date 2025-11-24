import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";
import { processTokensFromFiles } from "@src/processor/processFiles";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Helper to extract value from Symbol or return as-is
const getValue = (v: any) => (v && typeof v === "object" && "value" in v ? v.value : v);

describe("processTokensFromFiles", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "process-tokens-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should process a single flat token file", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        "color.primary": "#FF0000",
        "color.secondary": "#00FF00",
        "spacing.base": "8",
      }),
    );

    const result = await processTokensFromFiles({ path: tokensFile });

    expect(getValue(result.tokens.get("color.primary"))).toBe("#FF0000");
    expect(getValue(result.tokens.get("color.secondary"))).toBe("#00FF00");
    expect(getValue(result.tokens.get("spacing.base"))).toBe("8");
    expect(result.tokens.size).toBe(3);
  });

  it("should process a single nested token file", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        color: {
          primary: { $value: "#FF0000" },
          secondary: { $value: "#00FF00" },
        },
        spacing: {
          base: { $value: "8" },
        },
      }),
    );

    const result = await processTokensFromFiles({ path: tokensFile });

    expect(getValue(result.tokens.get("color.primary"))).toBe("#FF0000");
    expect(getValue(result.tokens.get("color.secondary"))).toBe("#00FF00");
    expect(getValue(result.tokens.get("spacing.base"))).toBe("8");
    expect(result.tokens.size).toBe(3);
  });

  it("should process multiple sets with activeSets", async () => {
    await fs.writeFile(
      path.join(tempDir, "global.json"),
      JSON.stringify({
        color: {
          base: { $value: "#000000" },
        },
      }),
    );

    await fs.writeFile(
      path.join(tempDir, "theme.json"),
      JSON.stringify({
        color: {
          primary: { $value: "#FF0000" },
        },
      }),
    );

    const result = await processTokensFromFiles({
      path: tempDir,
      activeSets: ["global", "theme"],
    });

    expect(getValue(result.tokens.get("color.base"))).toBe("#000000");
    expect(getValue(result.tokens.get("color.primary"))).toBe("#FF0000");
    expect(result.tokens.size).toBe(2);
  });

  it("should override tokens in order when processing multiple sets", async () => {
    await fs.writeFile(
      path.join(tempDir, "base.json"),
      JSON.stringify({
        color: {
          primary: { $value: "#000000" },
        },
      }),
    );

    await fs.writeFile(
      path.join(tempDir, "override.json"),
      JSON.stringify({
        color: {
          primary: { $value: "#FF0000" },
        },
      }),
    );

    const result = await processTokensFromFiles({
      path: tempDir,
      activeSets: ["base", "override"],
    });

    expect(getValue(result.tokens.get("color.primary"))).toBe("#FF0000");
    expect(result.tokens.size).toBe(1);
  });

  it("should process tokens with activeTheme", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        $themes: [
          {
            name: "light",
            selectedTokenSets: {
              global: "enabled",
              light: "enabled",
            },
          },
          {
            name: "dark",
            selectedTokenSets: {
              global: "enabled",
              dark: "enabled",
            },
          },
        ],
        global: {
          spacing: { base: { $value: "8" } },
        },
        light: {
          color: { background: { $value: "#FFFFFF" } },
        },
        dark: {
          color: { background: { $value: "#000000" } },
        },
      }),
    );

    const result = await processTokensFromFiles({
      path: tokensFile,
      activeTheme: "light",
    });

    expect(getValue(result.tokens.get("spacing.base"))).toBe("8");
    expect(getValue(result.tokens.get("color.background"))).toBe("#FFFFFF");
    expect(result.tokens.size).toBe(2);
  });

  it("should throw error when theme not found", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        $themes: [
          {
            name: "light",
            selectedTokenSets: {
              global: "enabled",
            },
          },
        ],
        global: {
          color: { primary: { $value: "#FF0000" } },
        },
      }),
    );

    await expect(
      processTokensFromFiles({
        path: tokensFile,
        activeTheme: "nonexistent",
      }),
    ).rejects.toThrow(ProcessorError);

    let error: ProcessorError | undefined;
    try {
      await processTokensFromFiles({
        path: tokensFile,
        activeTheme: "nonexistent",
      });
    } catch (e) {
      error = e as ProcessorError;
    }
    expect(error?.code).toBe(ProcessorErrorCode.THEME_NOT_FOUND);
    expect(error?.data.themeName).toBe("nonexistent");
  });

  it("should throw error when set not found", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        global: {
          color: { primary: { $value: "#FF0000" } },
        },
      }),
    );

    await expect(
      processTokensFromFiles({
        path: tokensFile,
        activeSets: ["nonexistent"],
      }),
    ).rejects.toThrow(ProcessorError);

    let error: ProcessorError | undefined;
    try {
      await processTokensFromFiles({
        path: tokensFile,
        activeSets: ["nonexistent"],
      });
    } catch (e) {
      error = e as ProcessorError;
    }
    expect(error?.code).toBe(ProcessorErrorCode.TOKEN_SET_NOT_FOUND);
    expect(error?.data.setName).toBe("nonexistent");
  });

  it("should interpret tokens with references", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        spacing: {
          base: { $value: "8" },
          small: { $value: "{spacing.base} / 2" },
          large: { $value: "{spacing.base} * 2" },
        },
      }),
    );

    const result = await processTokensFromFiles({ path: tokensFile });

    expect(getValue(result.tokens.get("spacing.base"))).toBe("8");
    expect(getValue(result.tokens.get("spacing.small"))).toBe("4");
    expect(getValue(result.tokens.get("spacing.large"))).toBe("16");
    expect(result.errors.size).toBe(0);
  });

  it("should interpret tokens with chained references", async () => {
    const tokensFile = path.join(tempDir, "tokens.json");
    await fs.writeFile(
      tokensFile,
      JSON.stringify({
        values: {
          a: { $value: "10" },
          b: { $value: "{values.a} + 5" },
          c: { $value: "{values.b} * 2" },
        },
      }),
    );

    const result = await processTokensFromFiles({ path: tokensFile });

    expect(getValue(result.tokens.get("values.a"))).toBe("10");
    expect(getValue(result.tokens.get("values.b"))).toBe("15");
    expect(getValue(result.tokens.get("values.c"))).toBe("30");
    expect(result.errors.size).toBe(0);
  });
});
