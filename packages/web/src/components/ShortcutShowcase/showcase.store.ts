import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import { SHOWCASE_STEP_IDS } from "@web/components/ShortcutShowcase/showcase.steps";
import {
  consumePendingShowcaseOffer,
  hasSeenShortcutShowcase,
  markShortcutShowcaseSeen,
  markShowcaseOfferPending,
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
};

export const initialShortcutShowcaseState: ShortcutShowcaseState = {
  isActive: false,
  stepIndex: 0,
  hasSeenShowcase: false,
};

/** Where a user who left early went next, so the funnel can tell them apart. */
export type ShowcaseExit = "calendar" | "signup";

export const useShortcutShowcaseStore = create<ShortcutShowcaseState>()(() => ({
  ...initialShortcutShowcaseState,
}));

export const stepIdAt = (index: number) =>
  SHOWCASE_STEP_IDS[index] ?? SHOWCASE_STEP_IDS[0];

/** Persist the seen flag and wake everyone reading it. */
const markSeen = () => {
  markShortcutShowcaseSeen();
  useShortcutShowcaseStore.setState({ hasSeenShowcase: true });
};

/** Shared by finish/skip: mark seen so it never auto-launches again. */
const endShowcase = () => {
  markSeen();
  useShortcutShowcaseStore.setState({ isActive: false, stepIndex: 0 });
};

/** How the practice arena was opened, so the activation funnel can tell them apart. */
export type ShowcaseEntry = "welcome" | "post_signup" | "palette";

const activate = (entry: ShowcaseEntry) => {
  useShortcutShowcaseStore.setState({ isActive: true, stepIndex: 0 });
  track("shortcut_showcase_started", { entry });
};

export const shortcutShowcaseActions = {
  /** Explore / Escape / backdrop from the welcome modal. */
  startFromWelcome: () => {
    activate("welcome");
  },
  /** Palette re-entry: always allowed, always from the first step. */
  replay: () => {
    activate("palette");
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
    useShortcutShowcaseStore.setState({ stepIndex: stepIndex + 1 });
  },
  finish: () => {
    track("shortcut_showcase_finished");
    endShowcase();
  },
  /**
   * Leaving before graduation. There is no "are you sure?" in the way: the
   * showcase is an offer, and the flow it guards (sign up, connect a calendar)
   * matters more than the two lessons.
   */
  skip: (exit: ShowcaseExit = "calendar") => {
    const { isActive, stepIndex } = useShortcutShowcaseStore.getState();
    if (!isActive) return;
    track("shortcut_showcase_skipped", { step: stepIdAt(stepIndex), exit });
    endShowcase();
  },
  /**
   * Welcome-modal signup: defer the offer until signup completes. Login
   * and explore do not call this — login leaves the flags alone, explore
   * starts the takeover via startFromWelcome.
   */
  markSkippedWithoutStarting: (options?: { pendingSignup?: boolean }) => {
    if (options?.pendingSignup) {
      markShowcaseOfferPending();
    }
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
