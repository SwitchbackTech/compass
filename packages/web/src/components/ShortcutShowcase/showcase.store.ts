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
   * Bumped every time the showcase is marked seen. Storage stays the source of
   * truth; this is the re-render signal for components that read it, because a
   * localStorage write notifies nobody. Without it the checklist stayed hidden
   * until the next render for anyone who skipped past the practice entirely.
   */
  seenRevision: number;
};

export const initialShortcutShowcaseState: ShortcutShowcaseState = {
  isActive: false,
  stepIndex: 0,
  seenRevision: 0,
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
  useShortcutShowcaseStore.setState((state) => ({
    seenRevision: state.seenRevision + 1,
  }));
};

/** Shared by finish/skip: mark seen so it never auto-launches again. */
const endShowcase = () => {
  markSeen();
  useShortcutShowcaseStore.setState({ isActive: false, stepIndex: 0 });
};

/**
 * Only two ways in now. The welcome modal used to launch the takeover before
 * anyone had committed to anything; signing up and connecting a calendar comes
 * first, and the practice is offered once there is a real calendar behind it.
 */
const activate = (entry: "post_signup" | "palette") => {
  useShortcutShowcaseStore.setState({ isActive: true, stepIndex: 0 });
  track("shortcut_showcase_started", { entry });
};

export const shortcutShowcaseActions = {
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
  /** Step back to redo the previous lesson; no-op on the first step. */
  back: () => {
    const { isActive, stepIndex } = useShortcutShowcaseStore.getState();
    if (!isActive || stepIndex === 0) return;
    track("shortcut_showcase_step_redone", { step: stepIdAt(stepIndex - 1) });
    useShortcutShowcaseStore.setState({ stepIndex: stepIndex - 1 });
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
   * Welcome-modal exit: signing up defers the offer to right after signup
   * completes; log-in and exploring without an account burn it immediately.
   */
  markSkippedWithoutStarting: (options?: { pendingSignup?: boolean }) => {
    if (options?.pendingSignup) {
      markShowcaseOfferPending();
      return;
    }
    markSeen();
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

export const selectShowcaseSeenRevision = (state: ShortcutShowcaseState) =>
  state.seenRevision;
