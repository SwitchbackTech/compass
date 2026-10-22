import { dismissSignupTrialStep } from "@web/components/AuthModal/dismiss-signup-trial-step";
import { describe, expect, it, mock } from "bun:test";

const trackTrialStepAbandoned = mock(() => undefined);

mock.module("@web/auth/posthog/signup-funnel", () => ({
  trackTrialStepAbandoned,
  trackTrialStepViewed: mock(),
  trackTrialStepCompleted: mock(),
}));

describe("dismissSignupTrialStep", () => {
  it("clears auth=trial and records trial_step_abandoned", () => {
    trackTrialStepAbandoned.mockClear();
    const navigate = mock(
      (options: { search: (prev: { auth?: string }) => unknown }) => {
        expect(options.search({ auth: "trial" })).toEqual({ auth: undefined });
      },
    );

    dismissSignupTrialStep(navigate as never);

    expect(trackTrialStepAbandoned).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ replace: true }),
    );
  });
});
