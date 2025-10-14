import { expect, test } from "@playwright/test";

test("DOM is not empty", async ({ page }) => {
  await page.goto("http://localhost:9080/");

  const body = await page.locator("body");
  await expect(body).toBeVisible();

  const html = await page.content();
  expect(html.length).toBeGreaterThan(0);
});
