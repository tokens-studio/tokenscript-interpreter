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
import path from "node:path";

describe("CLI Process Integration Tests", () => {
  const ctx = createTestContext("cli-process");

  beforeEach(async () => {
    await setupTempDir(ctx.tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(ctx.tempDir);
  });

  describe("Single File Processing", () => {
    it("should process a simple token file and return output data", async () => {
      const tokens = {
        colors: {
          primary: createToken("#FF0000", "color"),
          secondary: createToken("#00FF00", "color"),
        },
        spacing: {
          base: createToken("8", "dimension"),
          large: createToken("{spacing.base} * 2", "dimension"),
        },
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);
      const result = await runProcessCommand({ input: filePath });

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();

      // Check the actual data structure, not JSON strings
      // Default format is nested, so output is an object
      const output = result.data!.output;
      expect(output).toMatchObject({
        colors: {
          primary: "#FF0000",
          secondary: "#00FF00",
        },
        spacing: {
          base: 8,
          large: 16,
        },
      });
    });

    it("should write to output file when specified", async () => {
      const tokens = {
        colors: {
          primary: createToken("#FF0000", "color"),
        },
        spacing: {
          base: createToken("8", "dimension"),
        },
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);
      const outputPath = path.join(ctx.tempDir, "output.json");

      const result = await runProcessCommand({
        input: filePath,
        output: outputPath,
      });

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();

      const output = await readJsonFile(outputPath);
      expect(output).toMatchObject({
        colors: {
          primary: "#FF0000",
        },
        spacing: {
          base: 8,
        },
      });
    });

    it("should support flat format output", async () => {
      const tokens = {
        colors: {
          primary: createToken("#FF0000", "color"),
        },
        spacing: {
          base: createToken("8", "dimension"),
        },
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        format: "flat",
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();

      // Flat format returns a flat object
      const output = result.data!.output;
      expect(output).toEqual({
        "colors.primary": "#FF0000",
        "spacing.base": 8,
      });
    });

    it("should support nested format output (default)", async () => {
      const tokens = {
        colors: {
          primary: createToken("#FF0000", "color"),
        },
        spacing: {
          base: createToken("8", "dimension"),
        },
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        format: "nested",
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();

      const output = result.data!.output;
      expect(output).toMatchObject({
        colors: {
          primary: "#FF0000",
        },
        spacing: {
          base: 8,
        },
      });
    });
  });

  describe("Multi-Set Processing", () => {
    it("should process multiple token sets from directory", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "core.json": {
          base: createToken("8", "dimension"),
          primary: createToken("#FF0000", "color"),
        },
        "semantic.json": {
          spacing: createToken("{base} * 2", "dimension"),
          accent: createToken("{primary}", "color"),
        },
      });

      const result = await runProcessCommand({
        input: ctx.tempDir,
        sets: ["core", "semantic"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();

      const output = result.data!.output;
      expect(output).toMatchObject({
        base: 8,
        primary: "#FF0000",
        spacing: 16,
        accent: "#FF0000",
      });
    });

    it("should only process specified sets when multiple sets exist", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "set1.json": { token1: createToken("value1", "other") },
        "set2.json": { token2: createToken("value2", "other") },
        "set3.json": { token3: createToken("value3", "other") },
      });

      const result = await runProcessCommand({
        input: ctx.tempDir,
        sets: ["set1", "set3"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();

      const output = result.data!.output;
      expect(output).toMatchObject({
        token1: "value1",
        token3: "value3",
      });
      expect((output as Record<string, unknown>).token2).toBeUndefined();
    });

    it("should exit with error when specified set does not exist", async () => {
      await writeTokenFile(ctx.tempDir, "existing.json", {
        token: createToken("value", "other"),
      });

      const result = await runProcessCommand({
        input: ctx.tempDir,
        sets: ["nonexistent"],
      });

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/not found/i);
    });
  });

  describe("Theme Processing", () => {
    it("should process tokens using theme selection", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        light: {
          bg: createToken("#FFFFFF", "color"),
          fg: createToken("#000000", "color"),
        },
        dark: {
          bg: createToken("#000000", "color"),
          fg: createToken("#FFFFFF", "color"),
        },
        $themes: [
          createTheme("Light", { core: "enabled", light: "enabled" }),
          createTheme("Dark", { core: "enabled", dark: "enabled" }),
        ],
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      // Test Light theme
      const lightResult = await runProcessCommand({
        input: filePath,
        theme: "Light",
      });

      expect(lightResult.exitCode).toBe(0);
      expect(lightResult.data).toBeDefined();

      const lightOutput = lightResult.data!.output;
      expect(lightOutput).toMatchObject({
        base: 8,
        bg: "#FFFFFF",
        fg: "#000000",
      });

      // Test Dark theme
      const darkResult = await runProcessCommand({
        input: filePath,
        theme: "Dark",
      });

      expect(darkResult.exitCode).toBe(0);
      expect(darkResult.data).toBeDefined();

      const darkOutput = darkResult.data!.output;
      expect(darkOutput).toMatchObject({
        base: 8,
        bg: "#000000",
        fg: "#FFFFFF",
      });
    });

    it("should handle theme with array format selectedTokenSets", async () => {
      const tokens = {
        core: {
          base: createToken("16", "dimension"),
        },
        semantic: {
          spacing: createToken("{base} * 2", "dimension"),
        },
        $themes: [createTheme("Default", ["core", "semantic"])],
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        theme: "Default",
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();

      const output = result.data!.output;
      expect(output).toMatchObject({
        base: 16,
        spacing: 32,
      });
    });

    it("should exit with error when theme does not exist", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        $themes: [createTheme("ExistingTheme", { core: "enabled" })],
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        theme: "NonexistentTheme",
      });

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/not found/i);
    });

    it("should exit with error when no themes are defined but theme is requested", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        theme: "Light",
      });

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/no themes found/i);
    });
  });

  describe("Error Handling", () => {
    it("should collect multiple errors with --log-level warn", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        error1: createToken("{missing1}", "dimension"),
        error2: createToken("{missing2}", "dimension"),
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        logLevel: "warn",
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeDefined();

      const output = result.data!.output;
      expect((output as Record<string, unknown>).valid).toBe("16px");

      // Check errors structure (collectErrors returns an object keyed by token name)
      const errors = result.errors as Record<string, { message: string; originalValue: string }>;
      expect(Object.keys(errors)).toContain("error1");
      expect(Object.keys(errors)).toContain("error2");
    });

    it("should exit with code 1 when using --strict flag and errors exist", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        error1: createToken("{missing}", "dimension"),
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        strict: true,
      });

      expect(result.exitCode).toBe(1);
      expect(result.errors).toBeDefined();

      const errors = result.errors as Record<string, { message: string; originalValue: string }>;
      expect(Object.keys(errors)).toContain("error1");
    });

    it("should succeed with --strict when no errors exist", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        another: createToken("32px", "dimension"),
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runProcessCommand({
        input: filePath,
        strict: true,
      });

      expect(result.exitCode).toBe(0);
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();

      const output = result.data!.output;
      expect((output as Record<string, unknown>).valid).toBe("16px");
      expect((output as Record<string, unknown>).another).toBe("32px");
    });

    it("should handle invalid JSON gracefully", async () => {
      const fs = await import("node:fs");
      const tokensFile = path.join(ctx.tempDir, "invalid.json");
      await fs.promises.writeFile(tokensFile, "{ invalid json content }");

      const result = await runProcessCommand({
        input: tokensFile,
      });

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/json/i);
    });

    it("should handle non-existent file path", async () => {
      const nonExistentPath = path.join(ctx.tempDir, "does-not-exist.json");

      const result = await runProcessCommand({
        input: nonExistentPath,
      });

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });
  });

  describe("Complex Real-World Scenarios", () => {
    it("should process a design system with multiple layers", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "core.json": {
          dimension: {
            scale: createToken("2", "dimension"),
            xs: createToken("4", "dimension"),
            sm: createToken("{dimension.xs} * {dimension.scale}", "dimension"),
            md: createToken("{dimension.sm} * {dimension.scale}", "dimension"),
            lg: createToken("{dimension.md} * {dimension.scale}", "dimension"),
          },
          colors: {
            blue: {
              "500": createToken("#3B82F6", "color"),
              "600": createToken("#2563EB", "color"),
            },
          },
        },
        "semantic.json": {
          spacing: {
            xs: createToken("{dimension.xs}px", "spacing"),
            sm: createToken("{dimension.sm}px", "spacing"),
            md: createToken("{dimension.md}px", "spacing"),
          },
          colors: {
            primary: createToken("{colors.blue.500}", "color"),
            "primary-hover": createToken("{colors.blue.600}", "color"),
          },
        },
        "component.json": {
          button: {
            padding: createToken("{spacing.sm} {spacing.md}", "spacing"),
            background: createToken("{colors.primary}", "color"),
          },
        },
      });

      const result = await runProcessCommand({
        input: ctx.tempDir,
        sets: ["core", "semantic", "component"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();

      const output = result.data!.output;
      expect(output).toMatchObject({
        dimension: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 32,
        },
        spacing: {
          xs: "4px",
          sm: "8px",
          md: "16px",
        },
        colors: {
          primary: "#3B82F6",
        },
        button: {
          background: "#3B82F6",
        },
      });
    });

    it("should process design system and output to file with flat format", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "core.json": {
          colors: {
            primary: createToken("#FF0000", "color"),
          },
        },
        "semantic.json": {
          accent: createToken("{colors.primary}", "color"),
        },
      });

      const outputPath = path.join(ctx.tempDir, "output.json");

      const result = await runProcessCommand({
        input: ctx.tempDir,
        sets: ["core", "semantic"],
        format: "flat",
        output: outputPath,
      });

      expect(result.exitCode).toBe(0);

      const output = await readJsonFile(outputPath);
      expect(output).toEqual({
        "colors.primary": "#FF0000",
        accent: "#FF0000",
      });
    });
  });

  describe("Inspect Command", () => {
    it("should list available token sets", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "core.json": { token1: createToken("value1", "other") },
        "semantic.json": { token2: createToken("value2", "other") },
        "component.json": { token3: createToken("value3", "other") },
      });

      const result = await runInspectCommand(ctx.tempDir);

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();
      expect(result.data!.sets).toEqual(expect.arrayContaining(["core", "semantic", "component"]));
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
        $themes: [
          createTheme("Light", { core: "enabled", light: "enabled" }),
          createTheme("Dark", { core: "enabled", dark: "enabled" }),
        ],
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      const result = await runInspectCommand(filePath);

      expect(result.exitCode).toBe(0);
      expect(result.data).toBeDefined();
      expect(result.data!.sets).toEqual(expect.arrayContaining(["core", "light", "dark"]));
      expect(result.data!.themes).toBeDefined();
      expect(result.data!.themes?.Light).toEqual(expect.arrayContaining(["core", "light"]));
      expect(result.data!.themes?.Dark).toEqual(expect.arrayContaining(["core", "dark"]));
    });

    it("should handle error when input path does not exist", async () => {
      const nonExistentPath = path.join(ctx.tempDir, "does-not-exist.json");

      const result = await runInspectCommand(nonExistentPath);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });
  });
});
