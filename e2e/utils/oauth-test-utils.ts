import { Page, expect } from "@playwright/test";

/**
 * Sets up the page for OAuth overlay testing.
 * - Exposes test hooks for session state manipulation
 * - Mocks API endpoints
 */
export const prepareOAuthTestPage = async (page: Page) => {
  // Enable test mode before app loads
  await page.addInitScript(() => {
    // Enable e2e test mode - this exposes test hooks in the app
    (window as any).__COMPASS_E2E_TEST__ = true;
  });

  // Mock API endpoints to prevent real network calls
  await page.route("**/api/**", (route) => {
    const url = route.request().url();

    // Mock session check - return not authenticated
    if (url.includes("/session")) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "unauthorized" }),
      });
    }

    // Mock all other API calls
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
};

/**
 * Wait for the app to fully mount and be ready for interaction.
 */
export const waitForAppReady = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0;
    },
    { timeout: 15000 },
  );

  // Wait for store to be available
  await page.waitForFunction(
    () => typeof (window as any).__COMPASS_STORE__?.dispatch === "function",
    { timeout: 10000 },
  );
};

/**
 * Set the authenticating state via Redux (triggers OAuth overlay when true).
 */
export const setIsSyncing = async (page: Page, value: boolean) => {
  await page.evaluate((syncValue) => {
    const store = (window as any).__COMPASS_STORE__;
    if (!store) return;

    if (syncValue) {
      store.dispatch({ type: "auth/startAuthenticating" });
    } else {
      store.dispatch({ type: "auth/resetAuth" });
    }
  }, value);
  // Small delay to let React process the state change
  await page.waitForTimeout(50);
};

/**
 * Selectors for OAuth overlay elements.
 */
export const OVERLAY_SELECTORS = {
  /** The status overlay panel (specific to SyncEventsOverlay) */
  statusPanel: '[role="status"][aria-busy="true"][aria-live="polite"]',
  /** Spinner element */
  spinner: ".animate-spin",
};

/**
 * Text content for OAuth overlay phase.
 * Note: Import phase overlay was removed - import now happens in background.
 */
export const OVERLAY_TEXT = {
  oauthTitle: "Complete Google sign-in...",
  oauthMessage: "Please complete authorization in the popup window",
};

/**
 * Wait for body locked state to match expected value (with retry).
 */
export const expectBodyLocked = async (page: Page, locked: boolean) => {
  if (locked) {
    await expect(page.locator("body")).toHaveAttribute(
      "data-app-locked",
      "true",
    );
  } else {
    // When unlocked, the attribute is removed entirely
    await expect(page.locator("body")).not.toHaveAttribute(
      "data-app-locked",
      "true",
    );
  }
};

/**
 * Wait for overlay phase to match expected value (with retry).
 * Note: Import phase overlay was removed - import now happens in background.
 */
export const expectOverlayPhase = async (
  page: Page,
  phase: "oauth" | "none",
) => {
  if (phase === "oauth") {
    await expect(page.getByText(OVERLAY_TEXT.oauthTitle)).toBeVisible();
  } else {
    await expect(page.getByText(OVERLAY_TEXT.oauthTitle)).not.toBeVisible();
  }
};

/**
 * Assert that the OAuth phase overlay is visible.
 */
export const expectOAuthOverlayVisible = async (page: Page) => {
  await expect(page.getByText(OVERLAY_TEXT.oauthTitle)).toBeVisible();
  await expect(page.getByText(OVERLAY_TEXT.oauthMessage)).toBeVisible();
  await expect(page.locator(OVERLAY_SELECTORS.spinner)).toBeVisible();
  await expectBodyLocked(page, true);
};

/**
 * Assert that no overlay is visible.
 */
export const expectNoOverlay = async (page: Page) => {
  await expect(page.getByText(OVERLAY_TEXT.oauthTitle)).not.toBeVisible();
  await expectBodyLocked(page, false);
};
