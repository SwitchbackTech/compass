import { expect, test } from "@playwright/test";
import {
  type GoogleConnectionState,
  SIDEBAR_ICON_LABELS,
  markUserAsAuthenticated,
  prepareOAuthTestPage,
  setGoogleConnectionState,
  waitForAppReady,
} from "../utils/oauth-test-utils";

/**
 * E2E tests for sidebar Google Calendar connection status icon.
 *
 * These tests verify that the sidebar icon correctly reflects the 5 connection
 * states from the server (GoogleConnectionState), plus the client-only "checking"
 * state that appears while metadata is loading.
 *
 * Connection states and their icons:
 * - NOT_CONNECTED: CloudArrowUpIcon (cloud with arrow)
 * - RECONNECT_REQUIRED: LinkBreakIcon (broken link warning)
 * - IMPORTING: SpinnerIcon (loading spinner)
 * - HEALTHY: LinkIcon (connected link)
 * - ATTENTION: CloudWarningIcon (cloud with warning)
 * - "checking" (client-only): SpinnerIcon (loading spinner)
 *
 * The icon is rendered in SidebarIconRow and state is managed by useConnectGoogle hook.
 *
 * NOTE: These tests are skipped on mobile because the MobileGate component
 * blocks the entire app on mobile viewports.
 */
test.describe("Sidebar Connection Status", () => {
  // Skip on mobile - MobileGate blocks the app
  test.skip(({ isMobile }) => isMobile, "Sidebar not available on mobile");

  // Run tests serially to avoid state interference
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);
    // Extra wait to ensure app is fully stable
    await page.waitForTimeout(200);
  });

  test("shows cloud upload icon when NOT_CONNECTED", async ({ page }) => {
    await setGoogleConnectionState(page, "NOT_CONNECTED");

    const icon = page.getByLabel(SIDEBAR_ICON_LABELS.notConnected);
    await expect(icon).toBeVisible();
  });

  test("shows spinner icon when metadata is loading (checking state)", async ({
    page,
  }) => {
    // The "checking" state requires:
    // 1. userMetadataStatus === "loading"
    // 2. hasUserEverAuthenticated() returns true (localStorage flag)
    //
    // Set the localStorage flag first, then force loading state.
    await markUserAsAuthenticated(page);

    // Force the loading state by dispatching both clear and setLoading
    await page.evaluate(() => {
      const store = (window as any).__COMPASS_STORE__;
      if (!store) return;
      // Clear any existing metadata
      store.dispatch({ type: "userMetadata/clear" });
      // Set to loading state
      store.dispatch({ type: "userMetadata/setLoading" });
    });

    // Wait for state to be in loading
    await page.waitForFunction(
      () => {
        const store = (window as any).__COMPASS_STORE__;
        return store?.getState()?.userMetadata?.status === "loading";
      },
      { timeout: 5000 },
    );

    // Small delay for React to re-render
    await page.waitForTimeout(100);

    const icon = page.getByLabel(SIDEBAR_ICON_LABELS.syncing);
    await expect(icon).toBeVisible({ timeout: 5000 });
  });

  test("shows spinner icon during IMPORTING state", async ({ page }) => {
    await setGoogleConnectionState(page, "IMPORTING");

    const icon = page.getByLabel(SIDEBAR_ICON_LABELS.syncing);
    await expect(icon).toBeVisible();
  });

  test("shows link icon when HEALTHY", async ({ page }) => {
    await setGoogleConnectionState(page, "HEALTHY");

    const icon = page.getByLabel(SIDEBAR_ICON_LABELS.connected);
    await expect(icon).toBeVisible();
  });

  test("shows warning icon when ATTENTION", async ({ page }) => {
    await setGoogleConnectionState(page, "ATTENTION");

    const icon = page.getByLabel(SIDEBAR_ICON_LABELS.needsRepair);
    await expect(icon).toBeVisible();
  });

  test("shows broken link icon when RECONNECT_REQUIRED", async ({ page }) => {
    await setGoogleConnectionState(page, "RECONNECT_REQUIRED");

    const icon = page.getByLabel(SIDEBAR_ICON_LABELS.reconnectRequired);
    await expect(icon).toBeVisible();
  });
});

test.describe("Sidebar Connection Status - State Transitions", () => {
  // Skip on mobile - MobileGate blocks the app
  test.skip(({ isMobile }) => isMobile, "Sidebar not available on mobile");

  // Run tests serially to avoid state interference
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);
    // Extra wait to ensure app is fully stable
    await page.waitForTimeout(200);
  });

  test("transitions from NOT_CONNECTED to HEALTHY correctly", async ({
    page,
  }) => {
    // Start with NOT_CONNECTED
    await setGoogleConnectionState(page, "NOT_CONNECTED");
    await expect(
      page.getByLabel(SIDEBAR_ICON_LABELS.notConnected),
    ).toBeVisible();

    // Transition to HEALTHY (simulating successful OAuth flow)
    await setGoogleConnectionState(page, "HEALTHY");
    await expect(page.getByLabel(SIDEBAR_ICON_LABELS.connected)).toBeVisible();

    // Previous icon should no longer be visible
    await expect(
      page.getByLabel(SIDEBAR_ICON_LABELS.notConnected),
    ).not.toBeVisible();
  });

  test("cycles through connection states without visual glitches", async ({
    page,
  }) => {
    const states: GoogleConnectionState[] = [
      "NOT_CONNECTED",
      "IMPORTING",
      "HEALTHY",
      "ATTENTION",
      "RECONNECT_REQUIRED",
    ];

    for (const state of states) {
      await setGoogleConnectionState(page, state);
      // Brief pause to allow state to settle
      await page.waitForTimeout(50);
    }

    // Should end on RECONNECT_REQUIRED
    await expect(
      page.getByLabel(SIDEBAR_ICON_LABELS.reconnectRequired),
    ).toBeVisible();
  });
});
