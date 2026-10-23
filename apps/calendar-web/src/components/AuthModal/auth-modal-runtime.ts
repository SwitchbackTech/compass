import { openAuthModalFromOutsideRouter } from "@web/components/AuthModal/open-auth-modal.util";

export type OpenStartTrialStepOptions = {
  /** Use replace so closing the step does not leave `?auth=trial` in history. */
  replace?: boolean;
};

type OpenStartTrialStep = (options?: OpenStartTrialStepOptions) => void;

let openStartTrialStepImpl: OpenStartTrialStep | null = null;

/** Root auth provider registers the in-router opener; toasts use the fallback. */
export function registerOpenStartTrialStep(impl: OpenStartTrialStep): void {
  openStartTrialStepImpl = impl;
}

export function resetOpenStartTrialStepForTests(): void {
  openStartTrialStepImpl = null;
}

export async function openStartTrialStepModal(
  options?: OpenStartTrialStepOptions,
): Promise<void> {
  if (openStartTrialStepImpl) {
    openStartTrialStepImpl(options);
    return;
  }
  await openAuthModalFromOutsideRouter("startTrial");
}
