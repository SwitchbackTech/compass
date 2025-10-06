import fs from "fs";
import path from "path";
import { BrowserContext, Page } from "@playwright/test";

export const AUTH_STATES = {
  PRE_OAUTH: path.join(__dirname, "pre-oauth-state.json"),
  GOOGLE_AUTH: path.join(__dirname, "google-auth-state.json"),
} as const;

/**
 * Save the current browser context storage state
 */
export async function saveAuthState(
  context: BrowserContext,
  statePath: string,
): Promise<void> {
  await context.storageState({ path: statePath });
  console.log(`💾 Saved authentication state to: ${statePath}`);
}

/**
 * Check if an authentication state file exists
 */
export function hasAuthState(statePath: string): boolean {
  return fs.existsSync(statePath);
}

/**
 * Delete an authentication state file
 */
export function clearAuthState(statePath: string): void {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    console.log(`🗑️  Cleared authentication state: ${statePath}`);
  }
}

/**
 * Wait for Google OAuth redirect and save the authenticated state
 * This is a helper for manual OAuth completion
 */
export async function waitForOAuthCompletion(
  page: Page,
  context: BrowserContext,
  timeoutMs: number = 300000, // 5 minutes
): Promise<boolean> {
  console.log("⏳ Waiting for OAuth completion...");
  console.log("   Please complete the OAuth flow in the browser");

  try {
    // Wait for redirect back to the app (not Google)
    await page.waitForURL(/^(?!.*accounts\.google\.com).*/, {
      timeout: timeoutMs,
    });

    // Wait a bit more for the authentication to settle
    await page.waitForTimeout(2000);

    // Save the authenticated state
    await saveAuthState(context, AUTH_STATES.GOOGLE_AUTH);

    console.log("✅ OAuth completion detected and state saved");
    return true;
  } catch (error) {
    console.log("⏰ OAuth completion timed out");
    return false;
  }
}

/**
 * Navigate through the onboarding flow until we reach a specific step
 */
export async function navigateToStep(
  page: Page,
  targetSelector: string,
  maxAttempts: number = 20,
): Promise<boolean> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    // Check if we've reached the target step
    const isVisible = await page
      .locator(targetSelector)
      .isVisible()
      .catch(() => false);

    if (isVisible) {
      console.log(`✅ Reached target step after ${attempt} attempts`);
      return true;
    }

    // Try to advance to the next step
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Check again after Enter
    if (
      await page
        .locator(targetSelector)
        .isVisible()
        .catch(() => false)
    ) {
      console.log(`✅ Reached target step after ${attempt} attempts (Enter)`);
      return true;
    }

    // Try right arrow
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1000);

    if (
      await page
        .locator(targetSelector)
        .isVisible()
        .catch(() => false)
    ) {
      console.log(`✅ Reached target step after ${attempt} attempts (Arrow)`);
      return true;
    }

    attempt++;
    console.log(`🔄 Navigation attempt ${attempt}...`);
  }

  console.log(`❌ Could not reach target step after ${maxAttempts} attempts`);
  return false;
}
