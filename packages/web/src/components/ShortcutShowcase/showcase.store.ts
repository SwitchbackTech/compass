import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import { SHOWCASE_STEP_IDS } from "@web/components/ShortcutShowcase/showcase.steps";
import {
  clearShowcaseProgress,
  consumePendingShowcaseOffer,
  hasSeenShortcutShowcase,
  markShortcutShowcaseSeen,
  markShowcaseOfferPending,
  readShowcaseProgress,
  writeShowcaseProgress,
} from "@web/components/ShortcutShowcase/showcase.storage";

export type ShortcutShowcaseState = {
  isActive: boolean;
  stepIndex: number;
  /**
   * True once markSeen ran this session, so components re-render when the
   * flag flips — a localStorage write notifies nobody. Storage stays the
   * durable source; readers check this OR the stored flag.
   */
  hasSeenShowcase: boolean;
  /** First Skip/Esc arms leave; the second actually skips. */
  skipPending: boolean;
};

export const initialShortcutShowcaseState: ShortcutShowcaseState = {
  isActive: false,
  stepIndex: 0,
  hasSeenShowcase: false,
  skipPending: false,
};

/** Where a user who left early went next, so the funnel can tell them apart. */
export type ShowcaseExit = "calendar" | "signup";

export const useShortcutShowcaseStore = create<ShortcutShowcaseState>()(() => ({
  ...initialShortcutShowcaseState,
}));

export const stepIdAt = (index: number) =>
  SHOWCASE_STEP_IDS[index] ?? SHOWCASE_STEP_IDS[0];

const persistStep = (index: number) => {
  writeShowcaseProgress(stepIdAt(index));
};

const stepIndexForSavedId = (saved: string): number => {
  const index = SHOWCASE_STEP_IDS.indexOf(
    saved as (typeof SHOWCASE_STEP_IDS)[number],
  );
  return index === -1 ? 0 : index;
};

/** Persist the seen flag and wake everyone reading it. */
const markSeen = () => {
  markShortcutShowcaseSeen();
  clearShowcaseProgress();
  useShortcutShowcaseStore.setState({ hasSeenShowcase: true });
};

/** Shared by finish/skip: mark seen so it never auto-launches again. */
const endShowcase = () => {
  markSeen();
  useShortcutShowcaseStore.setState({
    isActive: false,
    stepIndex: 0,
    skipPending: false,
  });
};

/** How the practice arena was opened, so the activation funnel can tell them apart. */
export type ShowcaseEntry = "welcome" | "post_signup" | "palette";

/** Palette replay skips the intro pep talk and opens the first lesson. */
const PALETTE_START_INDEX = SHOWCASE_STEP_IDS.indexOf("create");

const activate = (entry: ShowcaseEntry) => {
  const stepIndex = entry === "palette" ? PALETTE_START_INDEX : 0;
  useShortcutShowcaseStore.setState({
    isActive: true,
    stepIndex,
    skipPending: false,
  });
  persistStep(stepIndex);
  track("shortcut_showcase_started", { entry });
};

export const shortcutShowcaseActions = {
  /** Explore / Escape / backdrop from the welcome modal. */
  startFromWelcome: () => {
    activate("welcome");
  },
  /** Palette re-entry: always allowed, always from the first lesson. */
  replay: () => {
    activate("palette");
  },
  /**
   * Restore an unfinished run after reload. Does not fire started: this is
   * the same attempt, not a new activation.
   */
  resumeIfInProgress: () => {
    const { isActive } = useShortcutShowcaseStore.getState();
    if (isActive) return;
    if (hasSeenShortcutShowcase()) return;
    const saved = readShowcaseProgress();
    if (!saved) return;
    const stepIndex = stepIndexForSavedId(saved);
    persistStep(stepIndex);
    useShortcutShowcaseStore.setState({
      isActive: true,
      stepIndex,
      skipPending: false,
    });
  },
  /** Graduation persists the flag before its reveal animation finishes. */
  markSeen,
  advance: () => {
    const { isActive, stepIndex } = useShortcutShowcaseStore.getState();
    if (!isActive) return;
    track("shortcut_showcase_step_completed", { step: stepIdAt(stepIndex) });
    if (stepIndex >= SHOWCASE_STEP_IDS.length - 1) {
      shortcutShowcaseActions.finish();
      return;
    }
    const nextIndex = stepIndex + 1;
    useShortcutShowcaseStore.setState({
      stepIndex: nextIndex,
      skipPending: false,
    });
    persistStep(nextIndex);
  },
  finish: () => {
    track("shortcut_showcase_finished");
    endShowcase();
  },
  /**
   * Arm, then confirm, a calendar leave. Skip and Esc call this so a stray
   * Escape does not dump a first-time user onto the calendar. Skip to sign
   * up still calls skip() immediately: that handoff is intentional.
   */
  requestSkip: (exit: ShowcaseExit = "calendar") => {
    const { isActive, skipPending } = useShortcutShowcaseStore.getState();
    if (!isActive) return;
    if (skipPending) {
      shortcutShowcaseActions.skip(exit);
      return;
    }
    useShortcutShowcaseStore.setState({ skipPending: true });
  },
  clearSkipPending: () => {
    if (!useShortcutShowcaseStore.getState().skipPending) return;
    useShortcutShowcaseStore.setState({ skipPending: false });
  },
  /**
   * Leave immediately and fire skipped. Used by Skip to sign up and by the
   * second Skip/Esc after requestSkip arms the confirm.
   */
  skip: (exit: ShowcaseExit = "calendar") => {
    const { isActive, stepIndex } = useShortcutShowcaseStore.getState();
    if (!isActive) return;
    track("shortcut_showcase_skipped", { step: stepIdAt(stepIndex), exit });
    endShowcase();
  },
  /** Welcome-modal signup: redeem the practice after signup completes. */
  deferUntilSignup: () => {
    markShowcaseOfferPending();
  },
  /** Called once, right after signup completes, to redeem a pending offer. */
  offerAfterSignupIfPending: () => {
    if (!consumePendingShowcaseOffer()) return;
    if (hasSeenShortcutShowcase()) return;
    activate("post_signup");
  },
};

export const selectShowcaseActive = (state: ShortcutShowcaseState) =>
  state.isActive;

export const selectShowcaseStepIndex = (state: ShortcutShowcaseState) =>
  state.stepIndex;

export const selectHasSeenShowcase = (state: ShortcutShowcaseState) =>
  state.hasSeenShowcase;

export const selectSkipPending = (state: ShortcutShowcaseState) =>
  state.skipPending;
