import { type FC } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { OnboardingTourResumeCard } from "@web/components/OnboardingTour/OnboardingTourResumeCard";
import {
  getOnboardingTourSteps,
  getPreviousOnboardingStepId,
  ONBOARDING_TOUR_STEP_IDS,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  onboardingTourActions,
  selectIsConfirmingTourSkip,
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useOnboardingStepAssist } from "@web/components/OnboardingTour/useOnboardingStepAssist";
import { useOnboardingTourKeyboardOnly } from "@web/components/OnboardingTour/useOnboardingTourKeyboardOnly";
import { useOnboardingTourProgress } from "@web/components/OnboardingTour/useOnboardingTourProgress";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

const TOUR_TEXT_BUTTON_CLASS =
  "c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const TOUR_PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary rounded-full px-4 py-1.5 text-xs";

/**
 * Hand-rolled coachmark card for the Start Now tour. Not an app-lock modal:
 * keyboard shortcuts underneath must keep working so each step can advance
 * by doing the action.
 */
export const OnboardingTour: FC = () => {
  useOnboardingTourProgress();
  useOnboardingTourKeyboardOnly();

  const isActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);
  const isConfirmingSkip = useOnboardingTourStore(selectIsConfirmingTourSkip);
  const isAssistVisible = useOnboardingStepAssist(isActive, stepId);

  if (!isActive) return <OnboardingTourResumeCard />;

  const steps = getOnboardingTourSteps();
  const step = steps.find((entry) => entry.id === stepId) ?? steps[0];
  const stepIndex = ONBOARDING_TOUR_STEP_IDS.indexOf(stepId);
  const isDone = stepId === "hardcore";
  const isFork = stepId === "fork";
  const canGoPrevious = getPreviousOnboardingStepId(stepId) !== null;
  const progressPercent =
    ((stepIndex + 1) / ONBOARDING_TOUR_STEP_IDS.length) * 100;

  return (
    <section
      aria-label="Onboarding tour"
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      data-onboarding-tour=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface/95 px-5 py-4 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        {isConfirmingSkip ? (
          <>
            <p className="font-medium text-sm">Skip the tour?</p>
            <p className="mt-1 text-sm text-text-muted">
              Enter to skip, any other key to keep going.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className={TOUR_TEXT_BUTTON_CLASS}
                onClick={onboardingTourActions.cancelSkipConfirm}
                type="button"
              >
                Keep going
              </button>
              <button
                className={TOUR_PRIMARY_BUTTON_CLASS}
                onClick={onboardingTourActions.skip}
                type="button"
              >
                Skip tour
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="font-medium text-sm">{step.title}</p>
              <p className="shrink-0 text-text-muted text-xs">
                {stepIndex + 1} / {ONBOARDING_TOUR_STEP_IDS.length}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-overlay"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
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
                    {isAssistVisible ? (
                      <button
                        className={TOUR_PRIMARY_BUTTON_CLASS}
                        onClick={
                          isDone
                            ? onboardingTourActions.finish
                            : onboardingTourActions.advance
                        }
                        type="button"
                      >
                        {isDone ? "Finish" : "Show me"}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
