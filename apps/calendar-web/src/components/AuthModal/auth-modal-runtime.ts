import { openAuthModalFromOutsideRouter } from "@web/components/AuthModal/open-auth-modal.util";

type OpenStartTrialStep = () => void;

let openStartTrialStepImpl: OpenStartTrialStep | null = null;

/** Root auth provider registers the in-router opener; toasts use the fallback. */
export function registerOpenStartTrialStep(impl: OpenStartTrialStep): void {
  openStartTrialStepImpl = impl;
}

export function resetOpenStartTrialStepForTests(): void {
  openStartTrialStepImpl = null;
}

export async function openStartTrialStepModal(): Promise<void> {
  if (openStartTrialStepImpl) {
    openStartTrialStepImpl();
    return;
  }
  await openAuthModalFromOutsideRouter("startTrial");
}
