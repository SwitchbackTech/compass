import { expect, test } from "@playwright/test";
import {
  OVERLAY_SELECTORS,
  OVERLAY_TEXT,
  expectBodyLocked,
  expectNoOverlay,
  expectOAuthOverlayVisible,
  expectOverlayPhase,
  prepareOAuthTestPage,
  setIsSyncing,
  waitForAppReady,
} from "../utils/oauth-test-utils";

/**
 * E2E tests for the OAuth sync overlay.
 *
 * These tests validate the SyncEventsOverlay component behavior during
 * the Google OAuth flow by using test hooks to control session state.
 *
 * The overlay shows during OAuth popup phase:
 * - OAuth phase: "Complete Google sign-in..." - when isSyncing=true
 *
 * Note: Calendar import now happens in the background with a sidebar spinner,
 * not a blocking overlay. The import phase overlay was removed.
 *
 * NOTE: These tests are skipped on mobile because the MobileGate component
 * blocks the entire app on mobile viewports, preventing the OAuth overlay
 * from ever being rendered. This is intentional product behavior.
 */
test.describe("OAuth Overlay", () => {
  // Skip on mobile - MobileGate blocks the app, so OAuth overlay never renders
  test.skip(
    ({ isMobile }) => isMobile,
    "OAuth overlay not available on mobile",
  );
  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);
  });

  test("renders overlay with OAuth phase message while user is authenticating", async ({
    page,
  }) => {
    // Initially no overlay should be visible
    await expectNoOverlay(page);

    // Trigger OAuth phase (isSyncing=true, importing=false)
    await setIsSyncing(page, true);

    // Verify OAuth overlay appears with correct content
    await expectOAuthOverlayVisible(page);

    // Verify the specific text content
    await expect(page.getByText(OVERLAY_TEXT.oauthTitle)).toBeVisible();
    await expect(page.getByText(OVERLAY_TEXT.oauthMessage)).toBeVisible();
  });

  test("hides overlay after user completes OAuth prompt", async ({ page }) => {
    // Start OAuth phase
    await setIsSyncing(page, true);
    await expectOAuthOverlayVisible(page);

    // Simulate OAuth completion - user accepted
    // The overlay should disappear (import happens in background with sidebar spinner)
    await setIsSyncing(page, false);

    // Verify overlay is gone
    await expectNoOverlay(page);
  });

  test("locks the app (body data-app-locked) when overlay is active", async ({
    page,
  }) => {
    // Initially not locked
    await expectBodyLocked(page, false);

    // Activate overlay
    await setIsSyncing(page, true);

    // Body should be locked
    await expectBodyLocked(page, true);

    // Deactivate overlay
    await setIsSyncing(page, false);

    // Body should be unlocked
    await expectBodyLocked(page, false);
  });

  test("blurs active element when overlay activates", async ({ page }) => {
    // Wait for main grid to be visible and focusable
    const mainGrid = page.locator("#mainGrid");
    await mainGrid.waitFor({ state: "visible", timeout: 10000 });
    await mainGrid.focus();

    await page.waitForTimeout(100); // Give time for focus to settle

    // Verify something is focused (not body)
    const activeBeforeOverlay = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(activeBeforeOverlay).not.toBe("BODY");

    // Activate overlay
    await setIsSyncing(page, true);
    await page.waitForTimeout(100); // Give time for blur effect

    // Active element should be blurred (now body)
    const activeAfterOverlay = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(activeAfterOverlay).toBe("BODY");
  });

  test("overlay cleans up data-app-locked attribute when dismissed", async ({
    page,
  }) => {
    // Activate overlay
    await setIsSyncing(page, true);
    await expectBodyLocked(page, true);

    // Clear OAuth state (simulating completion)
    await setIsSyncing(page, false);

    // Overlay should be gone and body unlocked
    await expectNoOverlay(page);
    await expectBodyLocked(page, false);
  });

  test("expectOverlayPhase returns correct phase", async ({ page }) => {
    // Initially no phase
    await expectOverlayPhase(page, "none");

    // OAuth phase
    await setIsSyncing(page, true);
    await expectOverlayPhase(page, "oauth");

    // Back to none after OAuth completes
    await setIsSyncing(page, false);
    await expectOverlayPhase(page, "none");
  });

  test("overlay has correct ARIA attributes for accessibility", async ({
    page,
  }) => {
    await setIsSyncing(page, true);

    // Check for status role panel (use more specific selector to avoid DndLiveRegion)
    const statusPanel = page.locator(OVERLAY_SELECTORS.statusPanel);
    await expect(statusPanel).toBeVisible();

    // Should have aria-busy for screen readers
    await expect(statusPanel).toHaveAttribute("aria-busy", "true");

    // Should have aria-live for announcements
    await expect(statusPanel).toHaveAttribute("aria-live", "polite");
  });

  test("displays spinner during OAuth phase", async ({ page }) => {
    const spinner = page.locator(OVERLAY_SELECTORS.spinner);

    // OAuth phase
    await setIsSyncing(page, true);
    await expect(spinner).toBeVisible();

    // No overlay after OAuth completes
    await setIsSyncing(page, false);
    await expect(spinner).not.toBeVisible();
  });
});

test.describe("OAuth Overlay - Edge Cases", () => {
  // Skip on mobile - MobileGate blocks the app, so OAuth overlay never renders
  test.skip(
    ({ isMobile }) => isMobile,
    "OAuth overlay not available on mobile",
  );

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);
  });

  test("handles rapid state changes without visual glitches", async ({
    page,
  }) => {
    // Rapidly toggle OAuth states
    await setIsSyncing(page, true);
    await setIsSyncing(page, false);
    await setIsSyncing(page, true);
    await setIsSyncing(page, false);

    // Should settle to no overlay
    await expectNoOverlay(page);
  });
});
