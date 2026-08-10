import { useEffect } from "react";
import { keyboardOnlyActions } from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { isSandboxStep } from "./onboarding.sandbox-events";
import {
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "./onboarding.tour.store";

/**
 * Programmatic keyboard-only entry for the tour's sandbox steps (see brief
 * 06's "Why this is split out from 01"): mouse clicks disable for the steps
 * that target a synthetic practice event, on top of the existing
 * double-Shift gesture in useKeyboardOnlyMode.ts.
 *
 * The effect cleanup is the whole exit-path audit: it fires on every path
 * that stops `shouldBeActive` being true - tour skip/finish (isActive flips
 * false), the fork exit and every other step change (stepId leaves the
 * sandbox set), and unmount - so there is exactly one place that can leak
 * keyboard-only mode, and it self-corrects by construction.
 */
export function useOnboardingSandboxKeyboardOnly() {
  const isTourActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);
  const shouldBeActive = isTourActive && isSandboxStep(stepId);

  useEffect(() => {
    if (!shouldBeActive) return;

    keyboardOnlyActions.enter();
    return () => keyboardOnlyActions.exit();
  }, [shouldBeActive]);
}
