import { expect, test } from "@playwright/test";
import {
  expectGoogleConnectionStateInStore,
  type GoogleConnectionState,
  markUserAsAuthenticated,
  prepareOAuthTestPage,
  SIDEBAR_STATUS_LABELS,
  setGoogleConnectionState,
  waitForAppReady,
} from "../utils/oauth-test-utils";

/**
 * E2E tests for Google Calendar connection state (Redux + the sidebar
 * account summary's sync-status live region when visible).
 *
 * `PlannerAccountSummary`'s status live region only renders once the sidebar
 * shows `AuthenticatedAccountSummary` (i.e. `useUser().email` is set), and
 * only for connection states other than NOT_CONNECTED — see
 * `getGoogleAccountSummaryStatus`.
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
    await markUserAsAuthenticated(page);

    // Reset to a clean NOT_CONNECTED state and wait for React to render
    // This prevents race conditions between cleanup and test state changes
    await setGoogleConnectionState(page, "NOT_CONNECTED");
  });

  test("stores NOT_CONNECTED in Redux (sidebar shows a plain email for the muted state)", async ({
    page,
  }) => {
    await expectGoogleConnectionStateInStore(page, "NOT_CONNECTED");
  });

  test("checking path: authenticated user with metadata loading shows the syncing status", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const store = window.__COMPASS_E2E_STORE__;
      if (!store) return;
      store.dispatch({ type: "userMetadata/clear" });
      store.dispatch({ type: "userMetadata/setLoading" });
    });

    await page.waitForFunction(
      () =>
        window.__COMPASS_E2E_STORE__?.getState()?.userMetadata?.status ===
        "loading",
      { timeout: 5000 },
    );

    // "Checking" renders the same syncing shimmer/tooltip as IMPORTING.
    await expect(
      page.getByRole("status", { name: SIDEBAR_STATUS_LABELS.syncing }),
    ).toBeAttached();
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

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);
    await markUserAsAuthenticated(page);

    // Reset to a clean NOT_CONNECTED state and wait for React to render
    // This prevents race conditions between cleanup and test state changes
    await setGoogleConnectionState(page, "NOT_CONNECTED");
  });

  test("transitions from RECONNECT_REQUIRED to ATTENTION correctly", async ({
    page,
  }) => {
    await setGoogleConnectionState(page, "RECONNECT_REQUIRED");
    await expect(
      page.getByRole("status", {
        name: SIDEBAR_STATUS_LABELS.reconnectRequired,
      }),
    ).toBeAttached();

    await setGoogleConnectionState(page, "ATTENTION");
    await expect(
      page.getByRole("status", { name: SIDEBAR_STATUS_LABELS.needsSync }),
    ).toBeAttached();
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
    }

    await expect(
      page.getByRole("status", {
        name: SIDEBAR_STATUS_LABELS.reconnectRequired,
      }),
    ).toBeAttached();
  });
});
