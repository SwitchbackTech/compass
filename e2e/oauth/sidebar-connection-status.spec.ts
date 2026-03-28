import { expect, test } from "@playwright/test";
import {
  type GoogleConnectionState,
  SIDEBAR_STATUS_LABELS,
  markUserAsAuthenticated,
  prepareOAuthTestPage,
  setGoogleConnectionState,
  waitForAppReady,
} from "../utils/oauth-test-utils";

/**
 * E2E tests for sidebar Google Calendar connection status.
 *
 * These tests verify that the sidebar status container correctly reflects the 5 connection
 * states from the server (GoogleConnectionState), plus the client-only "checking"
 * state that appears while metadata is loading.
 *
 * Connection states and their status messages:
 * - NOT_CONNECTED: "Google Calendar not connected. Click to connect."
 * - RECONNECT_REQUIRED: "Google Calendar needs reconnecting. Click to reconnect."
 * - IMPORTING: "Google Calendar is syncing in the background."
 * - HEALTHY: "Google Calendar connected."
 * - ATTENTION: "Google Calendar needs repair. Click to repair."
 * - "checking" (client-only): "Checking Google Calendar status…"
 *
 * The status is rendered in SidebarIconRow with role="status" and managed by useConnectGoogle hook.
 *
 * NOTE: These tests are skipped on mobile because the MobileGate component
 * blocks the entire app on mobile viewports.
 */
test.describe("Sidebar Connection Status", () => {
  // Skip on mobile - MobileGate blocks the app
  test.skip(({ isMobile }) => isMobile, "Sidebar not available on mobile");

  // Run tests serially to avoid state interference
  test.describe.configure({ mode: "serial" });

  // Helper to get the sidebar status container
  // Filter: has aria-label (excludes DndLiveRegion), no aria-busy (excludes overlay)
  const getSidebarStatus = (page: import("@playwright/test").Page) =>
    page.locator('#sidebar [role="status"][aria-label]:not([aria-busy])');

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);

    // Reset to a clean NOT_CONNECTED state and wait for React to render
    // This prevents race conditions between cleanup and test state changes
    await setGoogleConnectionState(page, "NOT_CONNECTED");
  });

  test("shows NOT_CONNECTED status", async ({ page }) => {
    // State already set in beforeEach - just verify it

    const status = getSidebarStatus(page);
    await expect(status).toHaveAttribute(
      "aria-label",
      SIDEBAR_STATUS_LABELS.notConnected,
    );
  });

  test("shows checking status when metadata is loading", async ({ page }) => {
    // The "checking" state requires:
    // 1. userMetadataStatus === "loading"
    // 2. hasUserEverAuthenticated() returns true (localStorage flag)
    //
    // Set the localStorage flag first, then force loading state.
    await markUserAsAuthenticated(page);

    // Force the loading state by dispatching both clear and setLoading
    await page.evaluate(() => {
      const store = window.__COMPASS_E2E_STORE__;
      if (!store) return;
      // Clear any existing metadata
      store.dispatch({ type: "userMetadata/clear" });
      // Set to loading state
      store.dispatch({ type: "userMetadata/setLoading" });
    });

    // Wait for state to be in loading
    await page.waitForFunction(
      () =>
        window.__COMPASS_E2E_STORE__?.getState()?.userMetadata?.status ===
        "loading",
      { timeout: 5000 },
    );

    // Wait for status container to show "checking" state via aria-label
    const status = getSidebarStatus(page);
    await expect(status).toHaveAttribute(
      "aria-label",
      /Checking Google Calendar/i,
    );
  });

  test("shows IMPORTING status", async ({ page }) => {
    await setGoogleConnectionState(page, "IMPORTING");
  });

  test("shows HEALTHY status", async ({ page }) => {
    await setGoogleConnectionState(page, "HEALTHY");
  });

  test("shows ATTENTION status", async ({ page }) => {
    await setGoogleConnectionState(page, "ATTENTION");
  });

  test("shows RECONNECT_REQUIRED status", async ({ page }) => {
    await setGoogleConnectionState(page, "RECONNECT_REQUIRED");
  });
});

test.describe("Sidebar Connection Status - State Transitions", () => {
  // Skip on mobile - MobileGate blocks the app
  test.skip(({ isMobile }) => isMobile, "Sidebar not available on mobile");

  // Run tests serially to avoid state interference
  test.describe.configure({ mode: "serial" });

  // Helper to get the sidebar status container
  // Filter: has aria-label (excludes DndLiveRegion), no aria-busy (excludes overlay)
  const getSidebarStatus = (page: import("@playwright/test").Page) =>
    page.locator('#sidebar [role="status"][aria-label]:not([aria-busy])');

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);

    // Reset to a clean NOT_CONNECTED state and wait for React to render
    // This prevents race conditions between cleanup and test state changes
    await setGoogleConnectionState(page, "NOT_CONNECTED");
  });

  test("transitions from NOT_CONNECTED to HEALTHY correctly", async ({
    page,
  }) => {
    const status = getSidebarStatus(page);

    // State already set to NOT_CONNECTED in beforeEach - just verify it
    await expect(status).toHaveAttribute(
      "aria-label",
      SIDEBAR_STATUS_LABELS.notConnected,
    );

    // Transition to HEALTHY (simulating successful OAuth flow)
    await setGoogleConnectionState(page, "HEALTHY");
    await expect(status).toHaveAttribute(
      "aria-label",
      SIDEBAR_STATUS_LABELS.connected,
    );
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
      // setGoogleConnectionState now waits for aria-label, no timeout needed
    }

    // Should end on RECONNECT_REQUIRED
    const status = getSidebarStatus(page);
    await expect(status).toHaveAttribute(
      "aria-label",
      SIDEBAR_STATUS_LABELS.reconnectRequired,
    );
  });
});
