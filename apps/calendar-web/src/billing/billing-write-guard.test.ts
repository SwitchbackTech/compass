import { blockAwaitingCheckoutEventWrite } from "@web/billing/billing-write-guard";
import {
  resetBillingWriteLockForTests,
  setBillingWriteLock,
} from "@web/billing/billing-write-lock";
import { resetTrialStepRequestForTests } from "@web/billing/trial-step-request";
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

const trialStepModule = await import("@web/billing/trial-step-request");

describe("blockAwaitingCheckoutEventWrite", () => {
  let requestTrialStep: ReturnType<typeof spyOn>;

  beforeEach(() => {
    openStartTrialStepModal.mockClear();
    requestTrialStep = spyOn(
      trialStepModule,
      "requestTrialStep",
    ).mockResolvedValue(true);
    resetBillingWriteLockForTests();
    resetTrialStepRequestForTests();
  });

  afterEach(() => {
    requestTrialStep.mockRestore();
    resetBillingWriteLockForTests();
    resetTrialStepRequestForTests();
  });

  it("blocks create and opens the trial step with event_action", () => {
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });

    expect(blockAwaitingCheckoutEventWrite("create")).toBe(true);
    expect(requestTrialStep).toHaveBeenCalledWith({
      trigger: "write",
      eventAction: "create",
    });
  });

  it("does not block when billing is open", () => {
    expect(blockAwaitingCheckoutEventWrite("create")).toBe(false);
    expect(requestTrialStep).not.toHaveBeenCalled();
  });
});
