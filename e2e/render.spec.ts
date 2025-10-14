import { expect, test } from "@playwright/test";

test("DOM is not empty", async ({ page }) => {
  await page.goto("http://localhost:9080/");

  const html = await page.content();
  expect(html.length).toBeGreaterThan(0);
});
