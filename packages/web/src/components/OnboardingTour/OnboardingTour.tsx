import { type FC } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import {
  getOnboardingTourSteps,
  getPreviousOnboardingStepId,
  ONBOARDING_TOUR_STEP_IDS,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  onboardingTourActions,
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useOnboardingSandboxKeyboardOnly } from "@web/components/OnboardingTour/useOnboardingSandboxKeyboardOnly";
import { useOnboardingTourProgress } from "@web/components/OnboardingTour/useOnboardingTourProgress";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

const TOUR_TEXT_BUTTON_CLASS =
  "c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const TOUR_PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary rounded-full px-4 py-1.5 text-xs";
const TOUR_SECONDARY_BUTTON_CLASS =
  "c-button c-button-secondary rounded-full px-4 py-1.5 text-xs";

/**
 * Hand-rolled coachmark card for the Start Now tour. Not an app-lock modal:
 * keyboard shortcuts underneath must keep working so each step can advance
 * by doing the action.
 */
export const OnboardingTour: FC = () => {
  useOnboardingTourProgress();
  useOnboardingSandboxKeyboardOnly();

  const isActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);

  if (!isActive) return null;

  const steps = getOnboardingTourSteps();
  const step = steps.find((entry) => entry.id === stepId) ?? steps[0];
  const stepIndex = ONBOARDING_TOUR_STEP_IDS.indexOf(stepId);
  const isDone = stepId === "done";
  const isFork = stepId === "fork";
  const canGoPrevious = getPreviousOnboardingStepId(stepId) !== null;

  return (
    <section
      aria-label="Onboarding tour"
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      data-onboarding-tour=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface/95 px-5 py-4 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="font-medium text-sm">{step.title}</p>
          <p className="shrink-0 text-text-muted text-xs">
            {stepIndex + 1} / {ONBOARDING_TOUR_STEP_IDS.length}
          </p>
        </div>
        <p className="text-sm text-text-muted">{step.body}</p>
        {step.shortcutHint ? (
          <p className="mt-3">
            <ShortcutKeys keys={step.shortcutHint} />
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3">
          {isFork ? (
            <>
              <button
                className={TOUR_TEXT_BUTTON_CLASS}
                onClick={onboardingTourActions.skip}
                type="button"
              >
                I'm done
              </button>
              <button
                className={TOUR_PRIMARY_BUTTON_CLASS}
                onClick={onboardingTourActions.advance}
                type="button"
              >
                Keep going
              </button>
            </>
          ) : (
            <>
              <button
                className={TOUR_TEXT_BUTTON_CLASS}
                onClick={onboardingTourActions.skip}
                type="button"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {canGoPrevious ? (
                  <button
                    className={TOUR_TEXT_BUTTON_CLASS}
                    onClick={onboardingTourActions.retreat}
                    type="button"
                  >
                    Previous
                  </button>
                ) : null}
                {isDone ? (
                  <button
                    className={TOUR_PRIMARY_BUTTON_CLASS}
                    onClick={onboardingTourActions.finish}
                    type="button"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    className={TOUR_SECONDARY_BUTTON_CLASS}
                    onClick={onboardingTourActions.advance}
                    type="button"
                  >
                    Next
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
