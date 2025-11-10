import * as path from "node:path";
import {
  cleanupTempDir,
  createTestContext,
  createTheme,
  createToken,
  readJsonFile,
  runInspectCommand,
  runProcessCommand,
  setupTempDir,
  writeTokenFile,
  writeTokenFiles,
} from "@tests/integration/helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("CLI Commands Integration Tests", () => {
  const ctx = createTestContext("cli-commands");

  beforeEach(async () => {
    await setupTempDir(ctx.tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(ctx.tempDir);
  });

  describe("process command", () => {
    it("should process tokens and output to console", async () => {
      const tokens = {
        base: createToken("8", "dimension"),
        double: createToken("{base} * 2", "dimension"),
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({ input: tokensFile });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual(
        expect.objectContaining({
          base: 8,
          double: 16,
        }),
      );
    });

    it("should output nested trees for dotted tokens and prefix references", async () => {
      const tokens = {
        colors: {
          base: createToken("#FFFFFF", "color"),
          accent: createToken("{colors.base}", "color"),
        },
        paletteCopy: createToken("{colors}", "color"),
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "nested.json", tokens);

      const result = await runProcessCommand({ input: tokensFile });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.colors).toEqual(
        expect.objectContaining({
          base: "#FFFFFF",
          accent: "#FFFFFF",
        }),
      );
      expect(output.paletteCopy).toEqual(
        expect.objectContaining({
          base: "#FFFFFF",
          accent: "#FFFFFF",
        }),
      );
    });

    it("should process tokens and write to output file", async () => {
      const tokens = {
        color: createToken("#FF0000", "color"),
        spacing: createToken("16px", "dimension"),
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);
      const outputFile = path.join(ctx.tempDir, "output.json");

      const result = await runProcessCommand({
        input: tokensFile,
        output: outputFile,
      });

      expect(result.exitCode).toBe(0);
      const output = await readJsonFile(outputFile);
      expect(output).toEqual(
        expect.objectContaining({
          color: "#FF0000",
          spacing: "16px",
        }),
      );
    });

    it("should process tokens with specified sets", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "core.json": { base: createToken("8", "dimension") },
        "light.json": { bg: createToken("#FFFFFF", "color") },
        "dark.json": { bg: createToken("#000000", "color") },
      });

      const result = await runProcessCommand({
        input: ctx.tempDir,
        sets: ["core", "light"],
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual(
        expect.objectContaining({
          base: 8,
          bg: "#FFFFFF",
        }),
      );
    });

    it("should process tokens using theme selection", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        light: {
          bg: createToken("#FFFFFF", "color"),
        },
        dark: {
          bg: createToken("#000000", "color"),
        },
        $themes: [createTheme("Light", { core: "enabled", light: "enabled" }), createTheme("Dark", { core: "enabled", dark: "enabled" })],
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const lightResult = await runProcessCommand({
        input: tokensFile,
        theme: "Light",
      });
      expect(lightResult.exitCode).toBe(0);
      const lightOutput = JSON.parse(lightResult.stdout);
      expect(lightOutput).toEqual(
        expect.objectContaining({
          base: 8,
          bg: "#FFFFFF",
        }),
      );

      const darkResult = await runProcessCommand({
        input: tokensFile,
        theme: "Dark",
      });
      expect(darkResult.exitCode).toBe(0);
      const darkOutput = JSON.parse(darkResult.stdout);
      expect(darkOutput).toEqual(
        expect.objectContaining({
          base: 8,
          bg: "#000000",
        }),
      );
    });

    it("should handle errors with --strict flag", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        invalid: createToken("{missing}", "dimension"),
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: tokensFile,
        strict: true,
      });

      expect(result.exitCode).toBe(1);
    });

    it("should output errors with --log-level warn", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        invalid: createToken("{missing}", "dimension"),
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: tokensFile,
        logLevel: "warn",
      });

      expect(result.stderr).toContain("errors");
      expect(result.stderr).toContain("invalid");
    });

    it("should handle missing input file gracefully", async () => {
      const nonExistentFile = path.join(ctx.tempDir, "does-not-exist.json");

      const result = await runProcessCommand({
        input: nonExistentFile,
      });

      expect(result.exitCode).toBe(1);
    });
  });

  describe("inspect command", () => {
    it("should list available sets", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "core.json": { base: createToken("8", "dimension") },
        "semantic.json": { spacing: createToken("16px", "dimension") },
      });

      const output = await runInspectCommand(ctx.tempDir);

      expect(output).toEqual(
        expect.objectContaining({
          sets: expect.arrayContaining(["core", "semantic"]),
        }),
      );
    });

    it("should list available themes", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        light: {
          bg: createToken("#FFFFFF", "color"),
        },
        dark: {
          bg: createToken("#000000", "color"),
        },
        $themes: [createTheme("Light", { core: "enabled", light: "enabled" }), createTheme("Dark", { core: "enabled", dark: "enabled" })],
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const output = await runInspectCommand(tokensFile);

      expect(output).toEqual(
        expect.objectContaining({
          sets: expect.any(Array),
          themes: expect.objectContaining({
            Light: expect.arrayContaining(["core", "light"]),
            Dark: expect.arrayContaining(["core", "dark"]),
          }),
        }),
      );
    });

    it("should show only sets when no themes exist", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const output = await runInspectCommand(tokensFile);

      expect(output).toEqual(
        expect.objectContaining({
          sets: expect.any(Array),
        }),
      );
      expect(output.sets.length).toBeGreaterThan(0);
      expect(output.themes).toBeUndefined();
    });

    it("should handle themes with array format selectedTokenSets", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        semantic: {
          spacing: createToken("16px", "dimension"),
        },
        $themes: [createTheme("Default", ["core", "semantic"])],
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const output = await runInspectCommand(tokensFile);

      expect(output).toEqual(
        expect.objectContaining({
          themes: expect.objectContaining({
            Default: expect.arrayContaining(["core", "semantic"]),
          }),
        }),
      );
    });
  });

  describe("Error scenarios", () => {
    it("should show error when theme not found", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        $themes: [createTheme("Light", { core: "enabled" })],
      };

      const tokensFile = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: tokensFile,
        theme: "NonExistent",
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });

    it("should show error when multiple sets exist but none specified", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "set1.json": { token1: createToken("value1", "other") },
        "set2.json": { token2: createToken("value2", "other") },
      });

      const result = await runProcessCommand({
        input: ctx.tempDir,
      });

      expect(result.exitCode).toBe(1);
    });
  });
});
