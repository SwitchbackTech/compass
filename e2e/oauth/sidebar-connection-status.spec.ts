import { type Page, expect, test } from "@playwright/test";
import {
  type GoogleConnectionState,
  SIDEBAR_STATUS_LABELS,
  expectGoogleConnectionStateInStore,
  markUserAsAuthenticated,
  prepareOAuthTestPage,
  setGoogleConnectionState,
  waitForAppReady,
} from "../utils/oauth-test-utils";

/**
 * E2E tests for Google Calendar connection state (Redux + header status when visible).
 *
 * HeaderInfoIcon only renders role="status" for warning/error states (reconnect required,
 * needs repair). Other states are reflected in Redux only; command palette still exposes
 * connect/repair actions.
 *
 * NOTE: These tests are skipped on mobile because the MobileGate component
 * blocks the entire app on mobile viewports.
 */
test.describe("Sidebar Connection Status", () => {
  // Skip on mobile - MobileGate blocks the app
  test.skip(({ isMobile }) => isMobile, "Sidebar not available on mobile");

  // Run tests serially to avoid state interference
  test.describe.configure({ mode: "serial" });

  const getHeaderGoogleStatus = (page: Page) =>
    page.locator("#cal").getByRole("status", { name: /Google Calendar/i });

  test.beforeEach(async ({ page }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);

    // Reset to a clean NOT_CONNECTED state and wait for React to render
    // This prevents race conditions between cleanup and test state changes
    await setGoogleConnectionState(page, "NOT_CONNECTED");
  });

  test("stores NOT_CONNECTED in Redux (header icon hidden for muted state)", async ({
    page,
  }) => {
    await expectGoogleConnectionStateInStore(page, "NOT_CONNECTED");
  });

  test("checking path: authenticated user with metadata loading", async ({
    page,
  }) => {
    await markUserAsAuthenticated(page);

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

    // "Checking" does not render HeaderInfoIcon (muted / no warning-error icon).
    await expect(getHeaderGoogleStatus(page)).toHaveCount(0);
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
    ).toBeVisible();

    await setGoogleConnectionState(page, "ATTENTION");
    await expect(
      page.getByRole("status", { name: SIDEBAR_STATUS_LABELS.needsRepair }),
    ).toBeVisible();
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
    ).toBeVisible();
  });
});
