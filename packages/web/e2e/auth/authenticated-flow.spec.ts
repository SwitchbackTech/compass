import { expect, test } from "@playwright/test";
import { AUTH_STATES, hasAuthState } from "../support/auth-helpers";

test.describe("Authenticated User Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Skip if no authenticated state is available
    if (!hasAuthState(AUTH_STATES.GOOGLE_AUTH)) {
      test.skip();
      return;
    }
  });

  test("should access main app with saved authentication", async ({
    browser,
  }) => {
    // Create new context with saved authentication
    const context = await browser.newContext({
      storageState: AUTH_STATES.GOOGLE_AUTH,
    });
    const page = await context.newPage();

    // Navigate to the app
    await page.goto("/");

    // Should bypass login and go to main app
    await page.waitForLoadState("networkidle");

    // Check that we're not on the login page
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/login/);

    // Should see main app elements (calendar view)
    // Adjust these selectors based on your main app UI
    await expect(page.locator("body")).toBeVisible();

    console.log("✅ Successfully accessed main app with saved authentication");
    console.log(`   Current URL: ${currentUrl}`);

    await context.close();
  });

  test("should handle logout and return to login", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: AUTH_STATES.GOOGLE_AUTH,
    });
    const page = await context.newPage();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate to logout (adjust selector based on your app)
    await page.goto("/logout");

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/);

    console.log("✅ Successfully logged out and redirected to login");

    await context.close();
  });
});
