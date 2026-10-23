import { trackSignupStep } from "@web/auth/posthog/signup-funnel";
import { track } from "@web/auth/posthog/track";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { sessionBrowserStore } from "@web/common/storage/browser-key-value.store";
import { type WelcomeStep } from "@web/components/WelcomeModal/welcome-steps";

const viewedStepsKey = STORAGE_KEYS.WELCOME_STEPS_VIEWED_SESSION;

let introEmittedInMemory = false;
const stepsEmittedInMemory = new Set<WelcomeStep>();

function readViewedSteps(): Set<WelcomeStep> {
  if (!sessionBrowserStore.isAvailable()) return new Set(stepsEmittedInMemory);
  const raw = sessionBrowserStore.get(viewedStepsKey);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((step): step is WelcomeStep => typeof step === "number"),
    );
  } catch {
    return new Set();
  }
}

function claimIntroOnce(): boolean {
  if (sessionBrowserStore.isAvailable()) {
    if (sessionBrowserStore.get(STORAGE_KEYS.WELCOME_INTRO_ANALYTICS_SESSION)) {
      return false;
    }
    sessionBrowserStore.set(
      STORAGE_KEYS.WELCOME_INTRO_ANALYTICS_SESSION,
      "true",
    );
    return true;
  }
  if (introEmittedInMemory) return false;
  introEmittedInMemory = true;
  return true;
}

/** Once per tab session: modal shown, welcome_viewed, and step 1 viewed. */
export function emitWelcomeIntroAnalyticsOnce(): void {
  if (!claimIntroOnce()) return;
  track("welcome_modal_shown");
  trackSignupStep("welcome_viewed");
  emitWelcomeStepViewedOnce(1);
}

/** Once per tab session for each welcome screen step (including revisits). */
export function emitWelcomeStepViewedOnce(step: WelcomeStep): void {
  const steps = readViewedSteps();
  if (steps.has(step)) return;
  steps.add(step);
  if (sessionBrowserStore.isAvailable()) {
    sessionBrowserStore.set(viewedStepsKey, JSON.stringify([...steps]));
  } else {
    stepsEmittedInMemory.add(step);
  }
  track("welcome_step_viewed", { step });
}

/** Test-only: reset in-memory guards when sessionStorage is cleared. */
export function resetWelcomeAnalyticsForTests(): void {
  introEmittedInMemory = false;
  stepsEmittedInMemory.clear();
}
