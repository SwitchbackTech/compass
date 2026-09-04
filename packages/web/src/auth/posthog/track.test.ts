import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const capture = mock();
let client: { capture: typeof capture } | undefined = { capture };

// bun's mock.module is global and leaks into every other test file in the
// run. Spread the real module so unrelated suites still see its full
// surface, and only override getPosthogClient while this file runs - the
// flag flips back to the real implementation in afterAll.
const actualPosthogBootstrap = {
  ...(await import("@web/auth/posthog/posthog.bootstrap")),
};
let isClientMocked = true;

mock.module("@web/auth/posthog/posthog.bootstrap", () => ({
  ...actualPosthogBootstrap,
  getPosthogClient: () =>
    isClientMocked ? client : actualPosthogBootstrap.getPosthogClient(),
}));

afterAll(() => {
  isClientMocked = false;
});

const { track } = await import("./track");
const {
  beginShortcutSuggestionPresentation,
  recordShortcutInvocation,
  recordShortcutUnavailableAttempt,
  resetShortcutTelemetryForTests,
} = await import("@web/shortcuts/tips/shortcut-telemetry");
const { clearAppLockReasons, setAppLockReason } = await import(
  "@web/shortcuts/app-lock"
);
const { getShortcutHint } = await import(
  "@web/shortcuts/tips/shortcut-tips.data"
);
const { readShortcutUsageProfile } = await import(
  "@web/shortcuts/tips/shortcut-personalization.storage"
);

beforeEach(() => {
  capture.mockClear();
  client = { capture };
  resetShortcutTelemetryForTests();
});

describe("track", () => {
  it("forwards the event name and properties to the PostHog client", () => {
    track("signup_started", { source: "welcome_modal" });

    expect(capture).toHaveBeenCalledWith("signup_started", {
      source: "welcome_modal",
    });
  });

  it("no-ops when PostHog is not initialized", () => {
    client = undefined;

    expect(() => track("event_created")).not.toThrow();
  });

  it("does not let a synchronous analytics failure interrupt the product", () => {
    capture.mockImplementationOnce(() => {
      throw new Error("capture unavailable");
    });

    expect(() => track("event_created")).not.toThrow();
  });
});

describe("shortcut telemetry", () => {
  it("captures one privacy-safe shown event and deduplicates an immediate remount", () => {
    const suggestion = {
      ...getShortcutHint("page-jump"),
      reasonCode: "calendar_idle" as const,
    };

    beginShortcutSuggestionPresentation(suggestion, 100_000);
    beginShortcutSuggestionPresentation(suggestion, 100_001);

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("shortcut_suggestion_shown", {
      action_id: "calendar.page_jump",
      feature_area: "calendar_navigation",
      outcome: "shown",
      rank: 1,
      reason_code: "calendar_idle",
      source: "sidebar_status",
    });
    expect(
      readShortcutUsageProfile().actions["calendar.page_jump"],
    ).toMatchObject({ recentImpressions: 1, lastShownAt: 100_000 });
  });

  it("records successful invocation and engagement with the visible suggestion", () => {
    beginShortcutSuggestionPresentation(
      {
        ...getShortcutHint("page-jump"),
        reasonCode: "local_discovery",
      },
      100_000,
    );
    capture.mockClear();

    recordShortcutInvocation("page-jump", 200_000);

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenNthCalledWith(1, "shortcut_invoked", {
      action_id: "calendar.page_jump",
      feature_area: "calendar_navigation",
      outcome: "succeeded",
      reason_code: "registered_shortcut",
      source: "keyboard",
    });
    expect(capture).toHaveBeenNthCalledWith(2, "shortcut_suggestion_engaged", {
      action_id: "calendar.page_jump",
      feature_area: "calendar_navigation",
      outcome: "invoked",
      rank: 1,
      reason_code: "local_discovery",
      source: "sidebar_status",
    });
    expect(
      readShortcutUsageProfile().actions["calendar.page_jump"],
    ).toMatchObject({ invocations: 1, lastInvokedAt: 200_000 });
  });

  it("captures which shortcut was blocked, by which lock owners, where", () => {
    window.history.pushState({}, "", "/week/2026-09-06");
    setAppLockReason("settingsModal", true);
    setAppLockReason("billingGate", true);
    setAppLockReason("overlayPanel::r3:", true);
    setAppLockReason("overlayPanel::r79:", true);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    recordShortcutUnavailableAttempt("edge-focus", "app_locked", {
      hotkey: "Tab",
      event: {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        repeat: true,
      },
    });

    expect(capture).toHaveBeenCalledWith("shortcut_unavailable_attempt", {
      action_id: "event.edge_focus",
      active_element: "input",
      context: "billingGate+overlayPanel+settingsModal",
      feature_area: "event_editing",
      is_repeat: true,
      outcome: "unavailable",
      reason_code: "app_locked",
      shortcut_key: "Tab",
      source: "keyboard",
      view: "week_view",
      was_modifier_held: false,
    });
    input.remove();
    clearAppLockReasons();
  });

  it("names the lock context unknown when no reason is registered", () => {
    window.history.pushState({}, "", "/day");
    recordShortcutUnavailableAttempt("nudge", "app_locked", {
      hotkey: { key: "ArrowLeft", shift: true },
      event: {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: true,
        repeat: false,
      },
    });

    expect(capture).toHaveBeenCalledWith(
      "shortcut_unavailable_attempt",
      expect.objectContaining({
        context: "unknown",
        shortcut_key: "Shift+ArrowLeft",
        view: "day_view",
        was_modifier_held: true,
      }),
    );
  });
});
