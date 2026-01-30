import { expect, test } from "@playwright/test";
import {
  OVERLAY_SELECTORS,
  OVERLAY_TEXT,
  expectBodyLocked,
  expectImportOverlayVisible,
  expectNoOverlay,
  expectOAuthOverlayVisible,
  expectOverlayPhase,
  prepareOAuthTestPage,
  setImporting,
  setIsSyncing,
  waitForAppReady,
} from "../utils/oauth-test-utils";

/**
 * E2E tests for the OAuth sync overlay.
 *
 * These tests validate the SyncEventsOverlay component behavior during
 * the Google OAuth flow by using test hooks to control session state.
 *
 * The overlay shows two phases:
 * 1. OAuth phase: "Complete Google sign-in..." - when isSyncing=true, importing=false
 * 2. Import phase: "Importing your Google Calendar..." - when importing=true
 */
test.describe("OAuth Overlay", () => {
  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/");
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

  test("shows import phase message after user accepts OAuth prompt", async ({
    page,
  }) => {
    // Start OAuth phase
    await setIsSyncing(page, true);
    await expectOAuthOverlayVisible(page);

    // Simulate OAuth completion - user accepted, now importing
    // When importing starts, isSyncing should be cleared and importing should be true
    await setIsSyncing(page, false);
    await setImporting(page, true);

    // Verify overlay updates to import phase
    await expectImportOverlayVisible(page);

    // Verify the specific text content changed
    await expect(page.getByText(OVERLAY_TEXT.importTitle)).toBeVisible();
    await expect(page.getByText(OVERLAY_TEXT.importMessage)).toBeVisible();

    // OAuth text should no longer be visible
    await expect(page.getByText(OVERLAY_TEXT.oauthTitle)).not.toBeVisible();
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

  test("blurs active element when overlay activates", async ({
    page,
    isMobile,
  }) => {
    // On mobile, the main grid might not be visible - use a different focusable element
    // or skip for mobile as the blur behavior is the same regardless of viewport
    if (isMobile) {
      // On mobile, find any focusable element that's visible
      const focusable = page
        .locator("button:visible, [tabindex]:visible")
        .first();
      await focusable.waitFor({ state: "visible", timeout: 10000 });
      await focusable.focus();
    } else {
      // Wait for main grid to be visible and focusable on desktop
      const mainGrid = page.locator("#mainGrid");
      await mainGrid.waitFor({ state: "visible", timeout: 10000 });
      await mainGrid.focus();
    }

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

    // Complete import phase
    await setImporting(page, true);
    await expectBodyLocked(page, true);

    // Clear all states (simulating completion)
    await setIsSyncing(page, false);
    await setImporting(page, false);

    // Overlay should be gone and body unlocked
    await expectNoOverlay(page);
    await expectBodyLocked(page, false);
  });

  test("getOverlayPhase returns correct phase", async ({ page }) => {
    // Initially no phase
    await expectOverlayPhase(page, "none");

    // OAuth phase
    await setIsSyncing(page, true);
    await expectOverlayPhase(page, "oauth");

    // Import phase
    await setIsSyncing(page, false);
    await setImporting(page, true);
    await expectOverlayPhase(page, "import");

    // Back to none
    await setImporting(page, false);
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

  test("displays spinner during both phases", async ({ page }) => {
    const spinner = page.locator(OVERLAY_SELECTORS.spinner);

    // OAuth phase
    await setIsSyncing(page, true);
    await expect(spinner).toBeVisible();

    // Import phase
    await setIsSyncing(page, false);
    await setImporting(page, true);
    await expect(spinner).toBeVisible();

    // No overlay
    await setImporting(page, false);
    await expect(spinner).not.toBeVisible();
  });
});

test.describe("OAuth Overlay - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("handles rapid state changes without visual glitches", async ({
    page,
  }) => {
    // Rapidly toggle states
    await setIsSyncing(page, true);
    await setIsSyncing(page, false);
    await setIsSyncing(page, true);
    await setImporting(page, true);
    await setImporting(page, false);
    await setIsSyncing(page, false);

    // Should settle to no overlay
    await expectNoOverlay(page);
  });

  test("shows import phase when both isSyncing and importing are true", async ({
    page,
  }) => {
    // When both are true, importing takes precedence (it's the later phase)
    // The component logic: isOAuthPhase = isSyncing && !importing
    // So when importing=true, it shows import message regardless of isSyncing
    await setIsSyncing(page, true);
    await setImporting(page, true);

    // Should show import phase text (importing overrides oauth phase)
    await expect(page.getByText(OVERLAY_TEXT.importTitle)).toBeVisible();
  });
});
