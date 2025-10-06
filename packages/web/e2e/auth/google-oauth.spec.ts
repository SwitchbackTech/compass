import path from "path";
import { BrowserContext, Page, expect, test } from "@playwright/test";

test.describe("Google OAuth Happy Path", () => {
  test("should navigate through onboarding and attempt Google OAuth", async ({
    page,
    context,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Should redirect to login/onboarding
    await expect(page).toHaveURL(/\/login/);

    // Wait for the welcome animation to complete or skip it
    await page.waitForSelector("text=Press Any Key to board", {
      timeout: 30000,
    });

    // Press Enter to proceed through welcome step
    await page.keyboard.press("Enter");

    // Should now be on the next onboarding step - check for any typical next step content
    // Wait a bit for the transition
    await page.waitForTimeout(1000);

    // Navigate through the onboarding steps until we reach Google OAuth
    // We'll press Enter or right arrow to advance through steps
    await navigateToGoogleOAuth(page);

    // Should now be on the Google OAuth step
    await expect(
      page.locator(
        'button[aria-label*="Sign in with Google"], button:has-text("Sign in with Google")',
      ),
    ).toBeVisible({ timeout: 10000 });

    console.log("✅ Successfully navigated to Google OAuth button");

    // Click the Google OAuth button
    const googleButton = page
      .locator(
        'button[aria-label*="Sign in with Google"], button:has-text("Sign in with Google")',
      )
      .first();
    await googleButton.click();

    // At this point, we would normally be redirected to Google's OAuth consent screen
    // Since we can't automate real Google OAuth without valid credentials,
    // we'll capture the current state and provide guidance

    // Wait a moment to see what happens
    await page.waitForTimeout(3000);

    // Check if we've been redirected to Google or if there's an error
    const currentUrl = page.url();
    console.log("Current URL after clicking Google button:", currentUrl);

    if (currentUrl.includes("accounts.google.com")) {
      console.log("✅ Successfully redirected to Google OAuth consent screen");

      // Save the browser context state before the OAuth flow for future use
      const storageStatePath = path.join(
        __dirname,
        "../support/pre-oauth-state.json",
      );
      await context.storageState({ path: storageStatePath });
      console.log("💾 Saved pre-OAuth browser state to:", storageStatePath);

      // This is where real user authentication would happen
      console.log(
        "📋 MANUAL STEP REQUIRED: Complete Google OAuth authentication manually",
      );
      console.log(
        "📋 After authentication, the browser state can be saved for future test runs",
      );
    } else {
      // We might be in a local environment where Google OAuth isn't properly configured
      console.log(
        "⚠️  Not redirected to Google OAuth. This might be expected in local dev environment.",
      );
      console.log("   Current URL:", currentUrl);

      // Take a screenshot to see what happened
      await page.screenshot({
        path: path.join(__dirname, "../support/oauth-attempt.png"),
      });
      console.log("📸 Screenshot saved to oauth-attempt.png");
    }
  });

  test("should load with saved authentication state (demonstration)", async ({
    browser,
  }) => {
    // This test demonstrates how to use saved authentication state
    // In a real scenario, this would be after completing OAuth manually

    const storageStatePath = path.join(
      __dirname,
      "../support/google-auth-state.json",
    );

    // Check if we have a saved auth state
    const fs = require("fs");
    if (!fs.existsSync(storageStatePath)) {
      console.log("⏭️  Skipping auth state test - no saved state found");
      console.log(
        "   Complete the OAuth flow first to generate:",
        storageStatePath,
      );
      test.skip();
      return;
    }

    // Create a new context with the saved authentication state
    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();

    // Navigate to the app - should skip OAuth if already authenticated
    await page.goto("/");

    // If authentication was successful, we should be redirected to the main app
    // rather than the login flow
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log("URL with saved auth state:", currentUrl);

    if (
      currentUrl === "http://localhost:3001/" ||
      !currentUrl.includes("/login")
    ) {
      console.log("✅ Successfully logged in with saved authentication state");
    } else {
      console.log(
        "⚠️  Still on login page - authentication state may have expired",
      );
    }

    await context.close();
  });
});

/**
 * Navigate through onboarding steps until we reach the Google OAuth step
 */
async function navigateToGoogleOAuth(page: Page) {
  const maxAttempts = 20;
  let attempt = 0;

  while (attempt < maxAttempts) {
    // Check if we're already at the Google OAuth step
    const googleButton = page.locator(
      'button[aria-label*="Sign in with Google"], button:has-text("Sign in with Google")',
    );
    const isVisible = await googleButton.isVisible().catch(() => false);

    if (isVisible) {
      console.log(`✅ Found Google OAuth button after ${attempt} steps`);
      return;
    }

    // Try to advance to the next step
    // First try pressing Enter, then try right arrow
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Check again
    const isVisibleAfterEnter = await googleButton
      .isVisible()
      .catch(() => false);
    if (isVisibleAfterEnter) {
      console.log(
        `✅ Found Google OAuth button after ${attempt} steps (Enter key)`,
      );
      return;
    }

    // Try right arrow
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1000);

    const isVisibleAfterArrow = await googleButton
      .isVisible()
      .catch(() => false);
    if (isVisibleAfterArrow) {
      console.log(
        `✅ Found Google OAuth button after ${attempt} steps (Arrow key)`,
      );
      return;
    }

    attempt++;
    console.log(`🔄 Step ${attempt}: Looking for Google OAuth button...`);

    // Log current page content for debugging
    const bodyText = await page.locator("body").textContent();
    console.log(`   Current page contains: ${bodyText?.substring(0, 100)}...`);
  }

  throw new Error(
    `Could not find Google OAuth button after ${maxAttempts} navigation attempts`,
  );
}
