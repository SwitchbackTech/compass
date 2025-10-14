import { expect, test } from "@playwright/test";
import { Result_VerifyGToken } from "../packages/core/src/types/auth.types";

test("redirects unauthenticated users from / to /login", async ({ page }) => {
  // Mock all API calls to prevent network failures in CI
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/auth/google")) {
      const googleResponse: Result_VerifyGToken = { isValid: false };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(googleResponse),
      });
    } else if (url.includes("/auth/session")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        // body: JSON.stringify({ exists: false }),
        body: JSON.stringify({ error: "User doesn't exist" }),
      });
    } else {
      // For any other API calls, return a generic response
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }
  });

  // Navigate to root path
  await page.goto("/");

  // Wait for redirect to complete
  await page.waitForURL("**/login**");

  // Verify URL contains /login
  expect(page.url()).toContain("/login");
});
