import { useEffect } from "react";
import { type OnboardingTourStepId } from "@web/components/OnboardingTour/onboarding.tour.steps";
import {
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { keyboardOnlyActions } from "@web/shortcuts/keyboard-only/keyboard-only.store";

/**
 * Mission steps that target a real grid event: mouse clicks disable for
 * these on top of the existing `h` Hardcore toggle in useKeyboardOnlyMode.ts,
 * so the keyboard is the only way through. `undo`/`hardcore` don't touch a
 * grid event directly and stay mouse-permissive; `create`/`save` are the
 * very first lesson and stay permissive too.
 */
const MISSION_STEP_IDS: ReadonlySet<OnboardingTourStepId> = new Set([
  "moveFocus",
  "editSequence",
  "targetEvent",
  "move",
  "resizeEdge",
  "placeDraft",
]);

/**
 * Programmatic keyboard-only entry for the tour's mission steps. The effect
 * cleanup is the whole exit-path audit: it fires on every path that stops
 * `shouldBeActive` being true - tour skip/finish (isActive flips false), the
 * fork exit and every other step change (stepId leaves the mission set), and
 * unmount - so there is exactly one place that can leak keyboard-only mode,
 * and it self-corrects by construction.
 */
export function useOnboardingTourKeyboardOnly() {
  const isTourActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);
  const shouldBeActive = isTourActive && MISSION_STEP_IDS.has(stepId);

  useEffect(() => {
    if (!shouldBeActive) return;

    keyboardOnlyActions.enter();
    return () => keyboardOnlyActions.exit();
  }, [shouldBeActive]);
}
