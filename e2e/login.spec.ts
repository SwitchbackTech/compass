import { expect, test } from "@playwright/test";

test("redirects unauthenticated users from / to /login", async ({ page }) => {
  // Mock the auth API calls that would normally fail in CI
  await page.route("**/api/auth/google", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "unauthorised" }),
    });
  });

  // Navigate to root path
  await page.goto("/");

  // Wait for redirect to complete
  await page.waitForURL("**/login**");

  // Verify URL contains /login
  expect(page.url()).toContain("/login");
});
