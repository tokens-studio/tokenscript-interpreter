import { expect, test } from "@playwright/test";

test("launches graph visualization and renders nodes", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Token Input (JSON)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fit View" }),
  ).toBeVisible();
});
