import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { processTokens } from "@src/processor/process";
import {
  assertHasErrors,
  assertNoErrors,
  cleanupTempDir,
  createTestContext,
  createTheme,
  createToken,
  processTokenFile,
  setupTempDir,
  writeTokenFile,
  writeTokenFiles,
} from "./helpers";

describe("CLI Process Integration Tests", () => {
  const ctx = createTestContext("cli-process");

  beforeEach(async () => {
    await setupTempDir(ctx.tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(ctx.tempDir);
  });

  describe("Single File Processing", () => {
    it("should process a simple token file", async () => {
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

      const result = await processTokenFile(ctx.tempDir, "tokens.json", tokens);

      expect(Object.fromEntries(result.tokens)).toEqual(
        expect.objectContaining({
          "colors.primary": "#FF0000",
          "colors.secondary": "#00FF00",
          "spacing.base": "8",
          "spacing.large": "16",
        }),
      );
      assertNoErrors(result);
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

      const result = await processTokens({
        path: ctx.tempDir,
        activeSets: ["core", "semantic"],
      });

      expect(result.tokens.get("base")).toBe("8");
      expect(result.tokens.get("primary")).toBe("#FF0000");
      expect(result.tokens.get("spacing")).toBe("16");
      expect(result.tokens.get("accent")).toBe("#FF0000");
      assertNoErrors(result);
    });

    it("should only process specified sets when multiple sets exist", async () => {
      await writeTokenFiles(ctx.tempDir, {
        "set1.json": { token1: createToken("value1", "other") },
        "set2.json": { token2: createToken("value2", "other") },
        "set3.json": { token3: createToken("value3", "other") },
      });

      const result = await processTokens({
        path: ctx.tempDir,
        activeSets: ["set1", "set3"],
      });

      expect(result.tokens.has("token1")).toBe(true);
      expect(result.tokens.has("token2")).toBe(false);
      expect(result.tokens.has("token3")).toBe(true);
    });

    it("should throw error when specified set does not exist", async () => {
      await writeTokenFile(ctx.tempDir, "existing.json", {
        token: createToken("value", "other"),
      });

      await expect(
        processTokens({
          path: ctx.tempDir,
          activeSets: ["nonexistent"],
        }),
      ).rejects.toThrow(/not found/i);
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

      const lightResult = await processTokens({
        path: filePath,
        activeTheme: "Light",
      });

      expect(lightResult.tokens.get("base")).toBe("8");
      expect(lightResult.tokens.get("bg")).toBe("#FFFFFF");
      expect(lightResult.tokens.get("fg")).toBe("#000000");

      const darkResult = await processTokens({
        path: filePath,
        activeTheme: "Dark",
      });

      expect(darkResult.tokens.get("base")).toBe("8");
      expect(darkResult.tokens.get("bg")).toBe("#000000");
      expect(darkResult.tokens.get("fg")).toBe("#FFFFFF");
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

      const result = await processTokenFile(ctx.tempDir, "tokens.json", tokens, {
        activeTheme: "Default",
      });

      expect(result.tokens.get("base")).toBe("16");
      expect(result.tokens.get("spacing")).toBe("32");
      assertNoErrors(result);
    });

    it("should throw error when theme does not exist", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
        $themes: [createTheme("ExistingTheme", { core: "enabled" })],
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      await expect(
        processTokens({
          path: filePath,
          activeTheme: "NonexistentTheme",
        }),
      ).rejects.toThrow(/not found/i);
    });

    it("should throw error when no themes are defined but theme is requested", async () => {
      const tokens = {
        core: {
          base: createToken("8", "dimension"),
        },
      };

      const filePath = await writeTokenFile(ctx.tempDir, "tokens.json", tokens);

      await expect(
        processTokens({
          path: filePath,
          activeTheme: "Light",
        }),
      ).rejects.toThrow(/no themes found/i);
    });
  });

  describe("Error Handling", () => {
    it("should collect multiple errors without stopping", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        error1: createToken("{missing1}", "dimension"),
        error2: createToken("{missing2}", "dimension"),
        error3: createToken("invalid expression {{", "dimension"),
      };

      const result = await processTokenFile(ctx.tempDir, "tokens.json", tokens);

      expect(result.tokens.get("valid")).toBe("16px");
      expect(result.errors.size).toBeGreaterThanOrEqual(2);
      assertHasErrors(result, ["error1", "error2"]);
    });

    it("should handle dependency chains in errors", async () => {
      const tokens = {
        a: createToken("{b}", "dimension"),
        b: createToken("{c}", "dimension"),
        c: createToken("{missing}", "dimension"),
      };

      const result = await processTokenFile(ctx.tempDir, "tokens.json", tokens);

      expect(result.errors.size).toBeGreaterThan(0);
      assertHasErrors(result, ["c"]);
    });

    it("should handle invalid JSON gracefully", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const tokensFile = path.join(ctx.tempDir, "invalid.json");
      await fs.promises.writeFile(tokensFile, "{ invalid json content }");

      await expect(
        processTokens({
          path: tokensFile,
        }),
      ).rejects.toThrow(/json/i);
    });

    it("should handle non-existent file path", async () => {
      const path = await import("node:path");
      const nonExistentPath = path.join(ctx.tempDir, "does-not-exist.json");

      await expect(
        processTokens({
          path: nonExistentPath,
        }),
      ).rejects.toThrow();
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

      const result = await processTokens({
        path: ctx.tempDir,
        activeSets: ["core", "semantic", "component"],
      });

      expect(result.tokens.get("dimension.xs")).toBe("4");
      expect(result.tokens.get("dimension.sm")).toBe("8");
      expect(result.tokens.get("dimension.md")).toBe("16");
      expect(result.tokens.get("dimension.lg")).toBe("32");
      expect(result.tokens.get("spacing.xs")).toBe("4px");
      expect(result.tokens.get("spacing.sm")).toBe("8px");
      expect(result.tokens.get("spacing.md")).toBe("16px");
      expect(result.tokens.get("colors.primary")).toBe("#3B82F6");
      expect(result.tokens.get("button.background")).toBe("#3B82F6");
      assertNoErrors(result);
    });
  });

  describe("Output Format", () => {
    it("should return tokens as strings", async () => {
      const tokens = {
        number: createToken("42", "dimension"),
        color: createToken("#FF0000", "color"),
        string: createToken("hello", "other"),
        calculated: createToken("10 + 5", "dimension"),
      };

      const result = await processTokenFile(ctx.tempDir, "tokens.json", tokens);

      expect(typeof result.tokens.get("number")).toBe("string");
      expect(typeof result.tokens.get("color")).toBe("string");
      expect(typeof result.tokens.get("string")).toBe("string");
      expect(result.tokens.get("calculated")).toBe("15");
    });

    it("should preserve original values for tokens with errors", async () => {
      const tokens = {
        valid: createToken("16px", "dimension"),
        invalid: createToken("{missing}", "dimension"),
      };

      const result = await processTokenFile(ctx.tempDir, "tokens.json", tokens);

      expect(result.tokens.get("valid")).toBe("16px");
      expect(result.tokens.get("invalid")).toBe("{missing}");
      assertHasErrors(result, ["invalid"]);
    });
  });
});
