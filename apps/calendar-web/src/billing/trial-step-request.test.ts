import {
  resetBillingWriteLockForTests,
  setBillingWriteLock,
} from "@web/billing/billing-write-lock";
import {
  consumeTrialStepTrigger,
  requestTrialStep,
  resetTrialStepRequestForTests,
} from "@web/billing/trial-step-request";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const openStartTrialStepModal = mock(() => Promise.resolve());
mock.module("@web/components/AuthModal/auth-modal-runtime", () => ({
  openStartTrialStepModal: () => openStartTrialStepModal(),
  registerOpenStartTrialStep: () => {},
  resetOpenStartTrialStepForTests: () => {},
}));

const trackModule = await import("@web/auth/posthog/track");

describe("requestTrialStep", () => {
  const track = spyOn(trackModule, "track");

  beforeEach(() => {
    openStartTrialStepModal.mockClear();
    track.mockClear();
    resetBillingWriteLockForTests();
    resetTrialStepRequestForTests();
  });

  afterEach(() => {
    resetBillingWriteLockForTests();
    resetTrialStepRequestForTests();
  });

  it("opens the trial modal and tracks write vs banner", async () => {
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });

    const opened = await requestTrialStep({ trigger: "banner" });

    expect(opened).toBe(true);
    expect(openStartTrialStepModal).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("trial_gate_triggered", {
      source: "banner",
    });
    expect(track).toHaveBeenCalledWith("billing_gate_shown", {
      status: "awaiting_checkout",
      surface: "explore_banner",
    });
    expect(consumeTrialStepTrigger()).toBe("banner");
  });

  it("no-ops for expired read-only accounts", async () => {
    setBillingWriteLock({ locked: true, status: "expired" });

    const opened = await requestTrialStep({ trigger: "write" });

    expect(opened).toBe(false);
    expect(openStartTrialStepModal).not.toHaveBeenCalled();
  });
});
