import { type FC } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { ONBOARDING_TOUR_STEP_IDS } from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  clearTourProgress,
  loadTourProgress,
} from "@web/components/OnboardingTour/onboarding.tour.storage";
import { onboardingTourActions } from "@web/components/OnboardingTour/onboarding.tour.store";

const TOUR_TEXT_BUTTON_CLASS =
  "c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text";
const TOUR_PRIMARY_BUTTON_CLASS =
  "c-button c-button-primary rounded-full px-4 py-1.5 text-xs";

/**
 * Shown in the tour's card slot when the tour is inactive but was abandoned
 * mid-way (tab closed, navigated away) rather than finished or skipped. Lets
 * the user pick back up instead of the tour silently never returning.
 */
export const OnboardingTourResumeCard: FC = () => {
  const stepId = loadTourProgress();

  if (!stepId) return null;

  return (
    <section
      aria-label="Resume onboarding tour"
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4"
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface/95 px-5 py-4 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        <p className="font-medium text-sm">Pick up where you left off?</p>
        <p className="mt-1 text-sm text-text-muted">
          {ONBOARDING_TOUR_STEP_IDS.indexOf(stepId)} of{" "}
          {ONBOARDING_TOUR_STEP_IDS.length} done.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className={TOUR_TEXT_BUTTON_CLASS}
            onClick={() => clearTourProgress()}
            type="button"
          >
            Dismiss
          </button>
          <button
            className={TOUR_PRIMARY_BUTTON_CLASS}
            onClick={() => onboardingTourActions.resume(stepId)}
            type="button"
          >
            Resume
          </button>
        </div>
      </div>
    </section>
  );
};
