import { expect, test } from "@playwright/test";

test("DOM is not empty", async ({ page }) => {
  await page.goto("/");

  const html = await page.content();
  expect(html.length).toBeGreaterThan(0);
});
