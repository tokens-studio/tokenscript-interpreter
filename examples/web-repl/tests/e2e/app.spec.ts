import { expect, test } from "@playwright/test";

test.describe("TokenScript Web REPL", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the initial page with all key components", async ({ page }) => {
    // Check that the main app container is present
    await expect(page.getByTestId("app-container")).toBeVisible();

    // Check that the header is present with correct title
    await expect(page.getByTestId("app-header")).toBeVisible();
    await expect(page.getByTestId("app-title")).toHaveText("TokenScript Web REPL");

    // Check that main content area is visible
    await expect(page.getByTestId("app-main")).toBeVisible();

    // Check that editor panel is present
    await expect(page.getByTestId("editor-panel")).toBeVisible();
    await expect(page.getByTestId("editor-panel-title")).toHaveText("TokenScript Editor");

    // Check that output panel is present
    await expect(page.getByTestId("output-panel")).toBeVisible();
    await expect(page.getByTestId("output-panel-title")).toHaveText("Output");

    // Check that run button is present and visible
    await expect(page.getByTestId("run-code-button")).toBeVisible();
    await expect(page.getByTestId("run-code-button")).toHaveText("Run Code");

    // Check that auto-run checkbox is present
    await expect(page.getByTestId("auto-run-checkbox")).toBeVisible();
  });

  test("should have Monaco editor loaded without errors", async ({ page }) => {
    // Wait for the Monaco editor container to be visible
    await expect(page.getByTestId("monaco-editor")).toBeVisible();
    await expect(page.getByTestId("monaco-editor-container")).toBeVisible();

    // Check that the Monaco editor instance is present (Monaco adds specific classes/elements)
    await expect(page.locator(".monaco-editor")).toBeVisible();

    // Check that editor shows the language indicator
    await expect(page.getByTestId("monaco-editor-language")).toHaveText("tokenscript");

    // Check that the editor is not showing any error state in its header
    await expect(page.getByTestId("monaco-editor-error")).not.toBeVisible();

    // Verify that the editor content area is present
    await expect(page.locator(".monaco-editor .view-lines")).toBeVisible();
  });

  test("should display initial color output", async ({ page }) => {
    // Wait for the output panel to be visible
    await expect(page.getByTestId("output-panel")).toBeVisible();
    await expect(page.getByTestId("output-content")).toBeVisible();

    // Since auto-run is enabled by default and there's default code,
    // we should see a color output rather than the empty state
    await expect(page.getByTestId("empty-output")).not.toBeVisible();

    // Check for color output elements
    await expect(page.getByTestId("color-output")).toBeVisible();
    await expect(page.getByTestId("color-preview-section")).toBeVisible();
    await expect(page.getByTestId("color-swatch")).toBeVisible();
    await expect(page.getByTestId("color-type-label")).toHaveText("Color Object");

    // Check that execution time is displayed
    await expect(page.getByTestId("execution-time")).toBeVisible();

    // Verify execution time shows a reasonable value (should be a number followed by 'ms')
    const executionTime = await page.getByTestId("execution-time").textContent();
    expect(executionTime).toMatch(/^\d+(\.\d+)?ms$/);
  });

  test("should switch between input modes", async ({ page }) => {
    // Initially should be in TokenScript mode
    await expect(page.getByTestId("tokenscript-mode-button")).toHaveClass(
      /bg-white text-blue-600 shadow-sm/,
    );
    await expect(page.getByTestId("editor-panel-title")).toHaveText("TokenScript Editor");

    // Switch to JSON mode
    await page.getByTestId("json-mode-button").click();
    await expect(page.getByTestId("json-mode-button")).toHaveClass(
      /bg-white text-blue-600 shadow-sm/,
    );
    await expect(page.getByTestId("editor-panel-title")).toHaveText("JSON Token Input");

    // Switch back to TokenScript mode
    await page.getByTestId("tokenscript-mode-button").click();
    await expect(page.getByTestId("tokenscript-mode-button")).toHaveClass(
      /bg-white text-blue-600 shadow-sm/,
    );
    await expect(page.getByTestId("editor-panel-title")).toHaveText("TokenScript Editor");
  });

  test("should execute code manually when run button is clicked", async ({ page }) => {
    // Disable auto-run first
    await page.getByTestId("auto-run-checkbox").uncheck();

    // Clear the output by adding some whitespace to the editor and then clearing it
    await page.locator(".monaco-editor textarea").focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(" ");
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    // Should show empty output
    await expect(page.getByTestId("empty-output")).toBeVisible();

    // Add some valid TokenScript code
    await page.keyboard.type("variable test: Color.Hsl = hsl(120, 100, 50); return test;");

    // Click run button
    await page.getByTestId("run-code-button").click();

    // Should see color output
    await expect(page.getByTestId("color-output")).toBeVisible();
    await expect(page.getByTestId("color-swatch")).toBeVisible();
  });

  test("should handle syntax errors gracefully", async ({ page }) => {
    // Focus on the editor and clear it
    await page.locator(".monaco-editor textarea").focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    // Add invalid TokenScript code
    await page.keyboard.type("invalid syntax here @#$%");

    // Should see error output
    await expect(page.getByTestId("error-output")).toBeVisible();
    await expect(page.getByTestId("error-message")).toBeVisible();

    // The error message should contain some text
    const errorText = await page.getByTestId("error-message").textContent();
    expect(errorText).toBeTruthy();
    expect(errorText?.length).toBeGreaterThan(0);
  });

  test("should show execution time for all operations", async ({ page }) => {
    // Wait for initial execution to complete
    await expect(page.getByTestId("execution-time")).toBeVisible();

    // Store initial execution time
    const initialTime = await page.getByTestId("execution-time")?.textContent();

    // Change the code to trigger a new execution
    await page.locator(".monaco-editor textarea").focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("variable newColor: Color.Rgb = rgb(255, 0, 0); return newColor;");

    // Wait for new execution to complete and time to update
    await expect(page.getByTestId("execution-time")).not.toHaveText(initialTime);

    // Verify it still shows a valid time format
    const newTime = await page.getByTestId("execution-time").textContent();
    expect(newTime).toMatch(/^\d+(\.\d+)?ms$/);
  });
});
