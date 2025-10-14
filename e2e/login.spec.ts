import { expect, test } from "@playwright/test";

test("redirects unauthenticated users from / to /login", async ({ page }) => {
  // Navigate to root path
  await page.goto("/");

  // Wait for redirect to complete
  await page.waitForURL("**/login**");

  // Verify URL contains /login
  expect(page.url()).toContain("/login");
});
