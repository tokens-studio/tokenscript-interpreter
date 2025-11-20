import { test, expect, type Page } from "@playwright/test";

const TOKENSCRIPT_PRESETS = [
  "Demo 1: Color Variable",
  "Demo 2: Color Method",
  "Demo 3: HSL Color Variable",
  "Demo 4: Color Ramp Loop",
  "Demo 5: Relative Darken Function",
  "Demo 6: HSL Ramp Function",
  "Demo 7: OKLCH Color Ramp",
  "Demo 8: Ramp to Hex Values",
  "Demo 9: Mixed Unit Addition",
  "Color palette",
  "Typography scale",
  "Typography scale (snapped)",
  "Responsive Font Size (remap)",
  "Opacity from Percentage (remap)",
  "Unit Spacing system",
  "Rainbow Color Scale",
  "Contrasting Text Color Finder",
];

const JSON_PRESETS = ["Basic tokens", "Design system"];

async function loadPreset(page: Page, presetName: string): Promise<void> {
  await page.getByRole("button", { name: "Load preset" }).click();
  await page.getByRole("button", { name: presetName, exact: true }).click();

  await expect(page.getByRole("button", { name: presetName, exact: true })).not.toBeVisible({
    timeout: 1000,
  }).catch(() => {});

  await page.waitForTimeout(500);
}

async function checkNoErrors(page: Page): Promise<void> {
  const outputPanel = page.locator('[data-testid="app-output-panel"]');
  
  const errorText = await outputPanel.locator('text=Error').count();
  const errorStyle = await outputPanel.locator('[class*="error"]').count();
  
  expect(errorText + errorStyle).toBe(0);
}

async function checkHasOutput(page: Page): Promise<void> {
  const outputPanel = page.locator('[data-testid="app-output-panel"]');
  await expect(outputPanel).not.toBeEmpty();
}

test.describe("Web REPL Presets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="app-container"]');
    await expect(page.getByText("Design system")).toBeVisible({ timeout: 10000 });
  });

  test.describe("TokenScript Presets", () => {
    for (const presetName of TOKENSCRIPT_PRESETS) {
      test(`should load and execute preset: ${presetName}`, async ({ page }) => {
        await loadPreset(page, presetName);

        await expect(page.getByText(`Input: ${presetName}`)).toBeVisible({ timeout: 10000 });

        const tokenscriptButton = page.getByRole("button", { name: "TokenScript" }).first();
        await expect(tokenscriptButton).toHaveAttribute("style", /border.*solid/);

        await page.waitForTimeout(2000);

        await checkNoErrors(page);
        await checkHasOutput(page);
      });
    }
  });

  test.describe("JSON Presets", () => {
    for (const presetName of JSON_PRESETS) {
      test(`should load and execute preset: ${presetName}`, async ({ page }) => {
        await loadPreset(page, presetName);

        await expect(page.getByText(`Input: ${presetName}`)).toBeVisible({ timeout: 10000 });

        const jsonButton = page.getByRole("button", { name: "JSON" }).first();
        await expect(jsonButton).toHaveAttribute("style", /border.*solid/, { timeout: 5000 });

        await page.waitForTimeout(2000);

        await checkNoErrors(page);
        await checkHasOutput(page);
      });
    }
  });

  test.describe("Preset loading functionality", () => {
    test("should update code editor when preset is loaded", async ({ page }) => {
      await loadPreset(page, "Demo 1: Color Variable");

      const editor = page.locator('[data-testid="editor-panel"]');
      await expect(editor).toContainText("variable yellow");
      await expect(editor).toContainText("#FF9900");
    });

    test("should clear dependencies when clearDependencies is true", async ({ page }) => {
      await loadPreset(page, "Demo 2: Color Method");
      await page.waitForTimeout(1000);
      await expect(page.getByText("HSL", { exact: true })).toBeVisible();

      await loadPreset(page, "Demo 1: Color Variable");

      await expect(page.getByText("No schemas configured")).toBeVisible({ timeout: 2000 });
    });

    test("should load dependencies when preset requires them", async ({ page }) => {
      await loadPreset(page, "Demo 1: Color Variable");
      await expect(page.getByText("No schemas configured")).toBeVisible({ timeout: 2000 });

      await loadPreset(page, "Demo 2: Color Method");

      await page.waitForTimeout(2000);

      await expect(page.getByText("HSL", { exact: true })).toBeVisible();
      await expect(page.getByText("SRGB", { exact: true })).toBeVisible();
    });

    test("should switch between TokenScript and JSON modes correctly", async ({ page }) => {
      await expect(page.getByText("Design system")).toBeVisible();

      await loadPreset(page, "Demo 1: Color Variable");
      
      const tokenscriptButton = page.getByRole("button", { name: "TokenScript" }).first();
      await expect(tokenscriptButton).toHaveAttribute("style", /border.*solid/);

      await loadPreset(page, "Basic tokens");

      const jsonButton = page.getByRole("button", { name: "JSON" }).first();
      await expect(jsonButton).toHaveAttribute("style", /border.*solid/);
    });
  });
});
