import { type Page, expect } from "@playwright/test";
import "./compass-window";

/**
 * Sets up the page for OAuth overlay testing.
 * - Exposes test hooks for session state manipulation
 * - Mocks API endpoints
 */
export const prepareOAuthTestPage = async (page: Page) => {
  // Enable test mode before app loads
  await page.addInitScript(() => {
    // Enable e2e test mode - this exposes test hooks in the app
    window.__COMPASS_E2E_TEST__ = true;
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
 * Set the authenticating state via Redux (triggers OAuth overlay when true).
 * Dispatches to the store and waits for the UI to reflect the change.
 * SessionProvider skips real session checks in e2e mode, so the store state
 * is stable after dispatch — no retry loop needed.
 */
export const setIsSyncing = async (page: Page, value: boolean) => {
  await page.evaluate((syncValue) => {
    const store = window.__COMPASS_E2E_STORE__;
    if (!store) return;
    if (syncValue) {
      store.dispatch({ type: "auth/startAuthenticating" });
    } else {
      store.dispatch({ type: "auth/resetAuth" });
    }
  }, value);

  if (value) {
    await expect(page.locator(OVERLAY_SELECTORS.statusPanel)).toBeVisible();
  } else {
    await expect(page.locator(OVERLAY_SELECTORS.statusPanel)).toHaveCount(0);
  }
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
 * Maps connection state to expected aria-label pattern on the status container.
 * These match the tooltip text from useConnectGoogle.
 */
const CONNECTION_STATE_TO_LABEL: Record<GoogleConnectionState, RegExp> = {
  NOT_CONNECTED: /not connected/i,
  RECONNECT_REQUIRED: /needs reconnecting/i,
  IMPORTING: /syncing/i,
  HEALTHY: /Google Calendar connected/i,
  ATTENTION: /needs repair/i,
};

/**
 * HeaderInfoIcon only renders role="status" for warning/error connection states
 * (see HeaderInfoIcon.tsx). Muted / checking / importing-without-background-import
 * do not expose this region.
 */
const GOOGLE_HEADER_STATUS_VISIBLE_STATES: GoogleConnectionState[] = [
  "RECONNECT_REQUIRED",
  "ATTENTION",
];

/**
 * Set the Google connection state via Redux userMetadata slice.
 * Dispatches to the store, waits for Redux to match, then asserts the header
 * status region when the UI shows it (reconnect required / needs repair).
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

  if (GOOGLE_HEADER_STATUS_VISIBLE_STATES.includes(state)) {
    await expect(
      page.getByRole("status", { name: CONNECTION_STATE_TO_LABEL[state] }),
    ).toBeVisible();
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
 * Mark user as having previously authenticated (sets localStorage flag).
 * This is required for the "checking" state to appear when metadata is loading.
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
};

/**
 * Patterns for the Google connection status container's aria-label.
 * These match the tooltip text from useConnectGoogle's sidebarStatus.
 * Tests should use getByRole("status") with these patterns.
 */
export const SIDEBAR_STATUS_LABELS = {
  notConnected: /not connected/i,
  reconnectRequired: /needs reconnecting/i,
  syncing: /syncing|Checking/i, // Used for both "checking" and "IMPORTING" states
  connected: /Google Calendar connected/i,
  needsRepair: /needs repair/i,
};
