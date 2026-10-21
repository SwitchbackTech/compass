import { waitFor } from "@testing-library/react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import {
  resetBillingWriteLockForTests,
  setBillingWriteLock,
} from "@web/billing/billing-write-lock";
import {
  promptShortcutUpgrade,
  resetShortcutUpgradePromptForTests,
} from "@web/billing/prompt-shortcut-upgrade";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { setAppLockReason } from "@web/shortcuts/app-lock";
import { getShortcutHint } from "@web/shortcuts/tips/shortcut-tips.data";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

const trackModule = await import("@web/auth/posthog/track");
const trialStepModule = await import("@web/billing/trial-step-request");

describe("promptShortcutUpgrade", () => {
  const { port, mocks } = createTestToastPort();
  const track = spyOn(trackModule, "track");
  let requestTrialStep: ReturnType<typeof spyOn>;

  beforeEach(() => {
    registerToastPort(port);
    mocks.toast.mockClear();
    mocks.update.mockClear();
    track.mockClear();
    requestTrialStep = spyOn(
      trialStepModule,
      "requestTrialStep",
    ).mockResolvedValue(true);
    resetShortcutUpgradePromptForTests();
    resetBillingWriteLockForTests();
  });

  afterEach(() => {
    requestTrialStep.mockRestore();
    resetShortcutUpgradePromptForTests();
    resetBillingWriteLockForTests();
  });

  it("no-ops when billing is not write-locked", () => {
    promptShortcutUpgrade({
      featureArea: "event_editing",
      actionId: "event.move",
      source: "keyboard",
    });

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("opens the trial step for awaiting_checkout instead of a toast", () => {
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });

    promptShortcutUpgrade({
      featureArea: "event_editing",
      actionId: "event.move",
      source: "keyboard",
    });

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(requestTrialStep).toHaveBeenCalledWith({ trigger: "write" });
  });

  it("no-ops while the billing gate owns the screen", () => {
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });
    setAppLockReason("billingGate", true);

    promptShortcutUpgrade({
      featureArea: "event_creation",
      actionId: "calendar.create_timed_event",
      source: "keyboard",
    });

    expect(mocks.toast).not.toHaveBeenCalled();
    setAppLockReason("billingGate", false);
  });

  it("routes keyed shortcuts to the trial step while awaiting checkout", () => {
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });

    promptShortcutUpgrade({
      featureArea: "event_creation",
      actionId: "calendar.create_timed_event",
      hintId: "create-event",
      source: "keyboard",
    });

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(requestTrialStep).toHaveBeenCalledWith({ trigger: "write" });
    expect(getShortcutHint("create-event").parts.length).toBeGreaterThan(0);
  });

  it("falls back to feature-area copy without a key line when no shortcut is known", async () => {
    setBillingWriteLock({ locked: true, status: "expired" });

    promptShortcutUpgrade({
      featureArea: "event_creation",
      actionId: "calendar.create_timed_event",
      source: "command_palette",
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledTimes(1);
    });
    const [[element]] = mocks.toast.mock.calls as unknown as [
      [{ props: Record<string, unknown> }],
    ];
    expect(element.props.parts).toBeUndefined();
    expect(element.props).toMatchObject({
      title:
        "Unlock event creation shortcuts with Premium. Upgrade in 30 seconds.",
      ctaLabel: "Subscribe",
    });
  });

  it("deduplicates tracking for a rapid repeat of the same shortcut", async () => {
    setBillingWriteLock({ locked: true, status: "expired" });

    promptShortcutUpgrade(
      {
        featureArea: "event_editing",
        actionId: "event.move",
        source: "keyboard",
      },
      100_000,
    );
    promptShortcutUpgrade(
      {
        featureArea: "event_editing",
        actionId: "event.move",
        source: "keyboard",
      },
      100_001,
    );

    expect(
      track.mock.calls.filter(([name]) => name === "shortcut_upgrade_prompted"),
    ).toHaveLength(1);
    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledTimes(2);
    });
  });
});
