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

    // Check that main content area is visible
    await expect(page.getByTestId("app-main")).toBeVisible();

    // Check that editor panel is present
    await expect(page.getByTestId("editor-panel")).toBeVisible();
    await expect(page.getByTestId("input-mode-dropdown")).toHaveValue("tokenscript");

    // Check that output panel is present
    await expect(page.getByTestId("app-output-panel")).toBeVisible();

    // Check that run button is present and visible
    await expect(page.getByTestId("run-code-button")).toBeVisible();

    // Check that auto-run checkbox is present
    await expect(page.getByTestId("auto-run-checkbox")).toBeVisible();
  });

  test("should have Monaco editor loaded without errors", async ({ page }) => {
    // Wait for the Monaco editor container to be visible
    await expect(page.getByTestId("monaco-editor")).toBeVisible();
    await expect(page.getByTestId("monaco-editor-container")).toBeVisible();

    // Check that the Monaco editor instance is present (Monaco adds specific classes/elements)
    await expect(page.locator(".monaco-editor")).toBeVisible();

    // Check that the editor is not showing any error state in its header
    await expect(page.getByTestId("monaco-editor-error")).not.toBeVisible();

    // Verify that the editor content area is present
    await expect(page.locator(".monaco-editor .view-lines")).toBeVisible();
  });

  test("should display initial color output", async ({ page }) => {
    // Wait for the output panel to be visible
    await expect(page.getByTestId("output-panel")).toBeVisible();
    await expect(page.getByTestId("output-panel-content")).toBeVisible();

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
    await expect(page.getByTestId("input-mode-dropdown")).toHaveValue("tokenscript");

    // Switch to JSON mode
    await page.getByTestId("input-mode-dropdown").selectOption("json");
    await expect(page.getByTestId("input-mode-dropdown")).toHaveValue("json");

    // Switch back to TokenScript mode
    await page.getByTestId("input-mode-dropdown").selectOption("tokenscript");
    await expect(page.getByTestId("input-mode-dropdown")).toHaveValue("tokenscript");
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

  test("should process JSON tokens and display formatted output", async ({ page }) => {
    // Switch to JSON mode
    await page.getByTestId("input-mode-dropdown").selectOption("json");
    await expect(page.getByTestId("input-mode-dropdown")).toHaveValue("json");


    // Wait for JSON editor to be visible
    await expect(page.getByTestId("json-editor")).toBeVisible();

    // Disable auto-run to control execution timing
    await page.getByTestId("auto-run-checkbox").uncheck();

    // Clear the JSON editor and add test JSON tokens
    await page.locator(".monaco-editor textarea").focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    const testJson = `{
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#3366ff"
    },
    "secondary": {
      "$type": "color", 
      "$value": "hsl(120, 100%, 50%)"
    }
  },
  "spacing": {
    "base": {
      "$type": "dimension",
      "$value": "16px"
    }
  }
}`;

    // Insert text by pasting
    await page.locator(".monaco-editor textarea").evaluate(async (element, evalText) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', evalText);
      const clipboardEvent = new ClipboardEvent('paste', {
        clipboardData,
      });
      element.dispatchEvent(clipboardEvent);
    }, testJson);

    // Click run to execute
    await page.getByTestId("run-code-button").click();

    // Wait for execution to complete
    await expect(page.getByTestId("execution-time")).toBeVisible();

    // Should show JSON output (not empty or error)
    await expect(page.getByTestId("empty-output")).not.toBeVisible();
    await expect(page.getByTestId("error-output")).not.toBeVisible();
    await expect(page.getByTestId("json-output")).toBeVisible();

    // Verify the output contains processed token data
    const outputContent = await page.getByTestId("json-output").textContent();
    expect(outputContent).toBeTruthy();
    expect(outputContent).toContain("colors");
    expect(outputContent).toContain("primary");
    expect(outputContent).toContain("secondary");
    expect(outputContent).toContain("spacing");

    // Verify execution time is displayed with correct format
    const executionTime = await page.getByTestId("execution-time").textContent();
    expect(executionTime).toMatch(/^\d+(\.\d+)?ms$/);
  });

  test("should handle invalid JSON gracefully in JSON mode", async ({ page }) => {
    // Switch to JSON mode
    await page.getByTestId("input-mode-dropdown").selectOption("json");
    await expect(page.getByTestId("json-editor")).toBeVisible();

    // Disable auto-run
    await page.getByTestId("auto-run-checkbox").uncheck();

    // Clear the editor and add invalid JSON
    await page.locator(".monaco-editor textarea").focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");

    // Add invalid JSON using fill to avoid intermediate parsing
    const invalidJson = '{ "invalid": json, missing quotes }';
    await page.locator(".monaco-editor textarea").fill(invalidJson);

    // Wait for validation
    await page.waitForTimeout(500);

    // Should show JSON error indicator in header
    await expect(page.getByTestId("json-editor-error")).toBeVisible();
    await expect(page.getByTestId("json-editor-error")).toHaveText("Invalid JSON");

    // Click run button
    await page.getByTestId("run-code-button").click();

    // Should show error output
    await expect(page.getByTestId("error-output")).toBeVisible();
    await expect(page.getByTestId("error-message")).toBeVisible();

    // Verify error message contains JSON-related text
    const errorText = await page.getByTestId("error-message").textContent();
    expect(errorText).toBeTruthy();
    expect(errorText?.toLowerCase()).toContain("json");
  });
});
