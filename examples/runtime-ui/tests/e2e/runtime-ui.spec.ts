import { expect, test } from "@playwright/test";

test("launches runtime UI and renders processor output", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Processor Output" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "color.primary.500" }),
  ).toBeVisible();
});
