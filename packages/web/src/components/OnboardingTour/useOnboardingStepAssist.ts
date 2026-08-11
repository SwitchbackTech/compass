import { useEffect, useRef, useState } from "react";
import { track } from "@web/auth/posthog/track";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { type OnboardingTourStepId } from "@web/components/OnboardingTour/onboarding.tour.steps";

const ASSIST_IDLE_MS = 15_000;
const ASSIST_ATTEMPT_THRESHOLD = 2;

/**
 * Reveals a "Show me" fallback on a verified step after two failed
 * keypresses or ~15s idle, so mission verification never becomes a hard
 * wall (spec principle 4, "stuck != trapped"). Resets on every step change.
 */
export function useOnboardingStepAssist(
  isActive: boolean,
  stepId: OnboardingTourStepId,
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const attemptsRef = useRef(0);
  const revealedRef = useRef(false);

  useEffect(() => {
    setIsVisible(false);
    attemptsRef.current = 0;
    revealedRef.current = false;
    if (!isActive) return;

    const reveal = () => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      setIsVisible(true);
      track("onboarding_step_assist_used", { step: stepId });
    };

    const idleTimer = window.setTimeout(reveal, ASSIST_IDLE_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      // Typing into a field (e.g. the title while creating/saving) is
      // progress, not a failed attempt at the current step's shortcut.
      if (isEditableKeyboardTarget(event)) return;
      attemptsRef.current += 1;
      if (attemptsRef.current >= ASSIST_ATTEMPT_THRESHOLD) reveal();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(idleTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isActive, stepId]);

  return isVisible;
}
