import { expect, type Page } from "@playwright/test";
import "./compass-window";

/**
 * Sets up the page for OAuth connection-state testing.
 * - Exposes test hooks for session state manipulation
 * - Mocks API endpoints
 */
export const prepareOAuthTestPage = async (page: Page) => {
  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => undefined);
  });

  // Enable test mode before app loads
  await page.addInitScript(() => {
    // Enable e2e test mode - this exposes test hooks in the app
    window.__COMPASS_E2E_TEST__ = true;
    window.alert = () => undefined;
    window.confirm = () => true;
    window.prompt = () => null;
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

    // Block user metadata requests to prevent overwriting test state.
    // The app fetches /api/user/metadata on mount, which would dispatch
    // userMetadata/set({}) and overwrite the test's Redux state.
    // Return 401 to trigger userMetadata/clear instead of set({}).
    if (url.includes("/user/metadata")) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "unauthorized" }),
      });
    }

    if (url.includes("/config")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ google: { isConfigured: true } }),
      });
    }

    // Resolves the profile fetch that `UserProvider` triggers once
    // `hasUserEverAuthenticated()` is true (see `markUserAsAuthenticated`
    // below), so `useUser().email` is populated and the sidebar renders
    // `AuthenticatedAccountSummary` instead of the temporary-account view.
    if (url.includes("/user/profile")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "e2e-test@example.com",
          firstName: "E2E",
          lastName: "Test",
          name: "E2E Test",
          locale: "en",
          picture: "",
          userId: "e2e-test-user",
        }),
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
    () => typeof window.__COMPASS_E2E_STORE__?.dispatch === "function",
    { timeout: 10000 },
  );

  // Avoid networkidle here. The app can keep background requests alive, which
  // makes this readiness check hang in CI even though the UI is already usable.
  await page.waitForFunction(() => document.readyState === "complete", {
    timeout: 10000,
  });

  // Wait for user metadata fetch to settle (not "loading").
  // This prevents race conditions between API responses and test state changes.
  await page.waitForFunction(
    () => {
      const status =
        window.__COMPASS_E2E_STORE__?.getState()?.userMetadata?.status;
      // Wait until status is "idle" or "loaded" (not "loading")
      return status !== "loading";
    },
    { timeout: 10000 },
  );
};

/**
 * Google connection states that can be set via Redux.
 */
export type GoogleConnectionState =
  | "NOT_CONNECTED"
  | "RECONNECT_REQUIRED"
  | "IMPORTING"
  | "HEALTHY"
  | "ATTENTION";

/**
 * Maps connection state to the expected accessible-name pattern on the
 * sidebar's sync-status live region. These match the tooltip copy from
 * `getGoogleAccountSummaryStatus` (see PlannerAccountSummary.tsx).
 */
const CONNECTION_STATE_TO_LABEL: Record<GoogleConnectionState, RegExp> = {
  NOT_CONNECTED: /not connected/i,
  RECONNECT_REQUIRED: /needs reconnecting/i,
  IMPORTING: /syncing/i,
  HEALTHY: /up-to-date/i,
  ATTENTION: /needs a sync/i,
};

/**
 * `PlannerAccountSummary`'s sr-only status live region renders for every
 * Google connection state except NOT_CONNECTED, which shows a plain,
 * tooltip-less email instead (see `getGoogleAccountSummaryStatus`).
 */
const GOOGLE_STATUS_VISIBLE_STATES: GoogleConnectionState[] = [
  "RECONNECT_REQUIRED",
  "IMPORTING",
  "HEALTHY",
  "ATTENTION",
];

/**
 * Set the Google connection state via Redux userMetadata slice.
 * Dispatches to the store, waits for Redux to match, then asserts the
 * sidebar's sync-status region when the UI shows it (every state except
 * NOT_CONNECTED).
 */
export const setGoogleConnectionState = async (
  page: Page,
  state: GoogleConnectionState,
) => {
  await page.evaluate((connectionState) => {
    const store = window.__COMPASS_E2E_STORE__;
    if (!store) return;
    store.dispatch({
      type: "userMetadata/set",
      payload: { google: { connectionState } },
    });
  }, state);

  await page.waitForFunction(
    (expected) => {
      const cs =
        window.__COMPASS_E2E_STORE__?.getState()?.userMetadata?.current?.google
          ?.connectionState;
      return cs === expected;
    },
    state,
    { timeout: 5000 },
  );

  if (GOOGLE_STATUS_VISIBLE_STATES.includes(state)) {
    // The status region is an sr-only live region (visually hidden by
    // design), so assert presence rather than visibility.
    await expect(
      page.getByRole("status", { name: CONNECTION_STATE_TO_LABEL[state] }),
    ).toBeAttached();
  }
};

export const expectGoogleConnectionStateInStore = async (
  page: Page,
  state: GoogleConnectionState,
) => {
  await page.waitForFunction(
    (expected) => {
      const cs =
        window.__COMPASS_E2E_STORE__?.getState()?.userMetadata?.current?.google
          ?.connectionState;
      return cs === expected;
    },
    state,
    { timeout: 5000 },
  );
};

/**
 * Marks the user as having previously authenticated (localStorage flag),
 * then reloads so the app boots with `hasUserEverAuthenticated()` already
 * true. That's required for `UserProvider` to fetch a profile (mocked in
 * `prepareOAuthTestPage`) and populate `useUser().email` — without an email,
 * the sidebar renders the temporary-account view, which never shows Google
 * connection status.
 */
export const markUserAsAuthenticated = async (page: Page) => {
  await page.evaluate(() => {
    // Must match STORAGE_KEYS.AUTH from storage.constants.ts
    const AUTH_STATE_KEY = "compass.auth";
    const existing = localStorage.getItem(AUTH_STATE_KEY);
    const state = existing ? JSON.parse(existing) : {};
    state.hasAuthenticated = true;
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
  });
  await page.reload();
  await waitForAppReady(page);
};

/**
 * Patterns for the sidebar's sync-status live region accessible name.
 * These match the tooltip copy from `getGoogleAccountSummaryStatus`.
 * Tests should use getByRole("status") with these patterns.
 */
export const SIDEBAR_STATUS_LABELS = {
  notConnected: /not connected/i,
  reconnectRequired: /needs reconnecting/i,
  syncing: /syncing/i, // Used for both "checking" and "IMPORTING" states
  connected: /up-to-date/i,
  needsSync: /needs a sync/i,
};
