import {
  resetBillingWriteLockForTests,
  setBillingWriteLock,
} from "@web/billing/billing-write-lock";
import { resetTrialStepRequestForTests } from "@web/billing/trial-step-request";
import { themeActions } from "@web/settings/theme/theme.store";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

const trialStepModule = await import("@web/billing/trial-step-request");

describe("explore before trial", () => {
  let requestTrialStep: ReturnType<typeof spyOn>;

  beforeEach(() => {
    requestTrialStep = spyOn(
      trialStepModule,
      "requestTrialStep",
    ).mockResolvedValue(true);
    setBillingWriteLock({ locked: true, status: "awaiting_checkout" });
  });

  afterEach(() => {
    requestTrialStep.mockRestore();
    resetBillingWriteLockForTests();
    resetTrialStepRequestForTests();
  });

  it("does not open the trial step when preferences change", () => {
    themeActions.setTheme("light-beach");

    expect(requestTrialStep).not.toHaveBeenCalled();
  });
});
