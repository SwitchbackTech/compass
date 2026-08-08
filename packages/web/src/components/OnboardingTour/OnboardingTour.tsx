import { type FC } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import {
  getOnboardingTourSteps,
  ONBOARDING_TOUR_STEP_IDS,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  onboardingTourActions,
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useOnboardingTourProgress } from "@web/components/OnboardingTour/useOnboardingTourProgress";

/**
 * Hand-rolled coachmark card for the Start Now tour. Not an app-lock modal:
 * keyboard shortcuts underneath must keep working so each step can advance
 * by doing the action.
 */
export const OnboardingTour: FC = () => {
  useOnboardingTourProgress();

  const isActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);

  if (!isActive) return null;

  const steps = getOnboardingTourSteps();
  const step = steps.find((entry) => entry.id === stepId) ?? steps[0];
  const stepIndex = ONBOARDING_TOUR_STEP_IDS.indexOf(stepId);
  const isDone = stepId === "done";

  return (
    <section
      aria-label="Onboarding tour"
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      data-onboarding-tour=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface-overlay px-5 py-4 text-text shadow-lg">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="font-medium text-sm">{step.title}</p>
          <p className="shrink-0 text-text-muted text-xs">
            {stepIndex + 1} / {ONBOARDING_TOUR_STEP_IDS.length}
          </p>
        </div>
        <p className="text-sm text-text-muted">{step.body}</p>
        {step.shortcutHint ? (
          <p className="mt-3">
            <kbd className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-text text-xs">
              {step.shortcutHint}
            </kbd>
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className="c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:text-text"
            onClick={onboardingTourActions.skip}
            type="button"
          >
            Skip tour
          </button>
          {isDone ? (
            <button
              className="c-button c-button-primary rounded-full px-4 py-1.5 text-xs"
              onClick={onboardingTourActions.finish}
              type="button"
            >
              Finish
            </button>
          ) : (
            <button
              className="c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:text-text"
              onClick={onboardingTourActions.advance}
              type="button"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
