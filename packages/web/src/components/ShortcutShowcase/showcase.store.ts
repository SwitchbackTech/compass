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
  /** True while the "skip the shortcuts?" inline confirm is showing. */
  isConfirmingSkip: boolean;
  /** Once per entry: after the first confirm, Escape skips directly. */
  hasShownSkipConfirm: boolean;
};

export const initialShortcutShowcaseState: ShortcutShowcaseState = {
  isActive: false,
  stepIndex: 0,
  isConfirmingSkip: false,
  hasShownSkipConfirm: false,
};

export const useShortcutShowcaseStore = create<ShortcutShowcaseState>()(() => ({
  ...initialShortcutShowcaseState,
}));

const stepIdAt = (index: number) =>
  SHOWCASE_STEP_IDS[index] ?? SHOWCASE_STEP_IDS[0];

/** Shared by finish/skip: mark seen so it never auto-launches again. */
const endShowcase = () => {
  markShortcutShowcaseSeen();
  useShortcutShowcaseStore.setState({ ...initialShortcutShowcaseState });
};

export type ShowcaseEntry = "start_now" | "escape" | "post_signup" | "palette";

const activate = (entry: ShowcaseEntry) => {
  useShortcutShowcaseStore.setState({
    ...initialShortcutShowcaseState,
    isActive: true,
  });
  track("shortcut_showcase_started", { entry });
};

export const shortcutShowcaseActions = {
  /** Welcome modal Start Now / Escape: launch unless already seen. */
  start: (entry: "start_now" | "escape" = "start_now") => {
    if (hasSeenShortcutShowcase()) return;
    activate(entry);
  },
  /** Palette re-entry: always allowed, always from the first step. */
  replay: () => {
    activate("palette");
  },
  advance: () => {
    const { isActive, stepIndex, isConfirmingSkip } =
      useShortcutShowcaseStore.getState();
    if (!isActive || isConfirmingSkip) return;
    track("shortcut_showcase_step_completed", { step: stepIdAt(stepIndex) });
    if (stepIndex >= SHOWCASE_STEP_IDS.length - 1) {
      shortcutShowcaseActions.finish();
      return;
    }
    useShortcutShowcaseStore.setState({ stepIndex: stepIndex + 1 });
  },
  /** Step back to redo the previous lesson; no-op on the first step. */
  back: () => {
    const { isActive, stepIndex, isConfirmingSkip } =
      useShortcutShowcaseStore.getState();
    if (!isActive || isConfirmingSkip || stepIndex === 0) return;
    track("shortcut_showcase_step_redone", { step: stepIdAt(stepIndex - 1) });
    useShortcutShowcaseStore.setState({ stepIndex: stepIndex - 1 });
  },
  finish: () => {
    track("shortcut_showcase_finished");
    endShowcase();
  },
  skip: () => {
    const { stepIndex } = useShortcutShowcaseStore.getState();
    track("shortcut_showcase_skipped", { step: stepIdAt(stepIndex) });
    endShowcase();
  },
  /** Escape/Skip, first time this entry: show the keyboard-first confirm. */
  requestSkipConfirm: () => {
    const { isActive } = useShortcutShowcaseStore.getState();
    if (!isActive) return;
    useShortcutShowcaseStore.setState({
      isConfirmingSkip: true,
      hasShownSkipConfirm: true,
    });
  },
  cancelSkipConfirm: () => {
    useShortcutShowcaseStore.setState({ isConfirmingSkip: false });
  },
  /**
   * Welcome-modal auth handoff: signing up defers the offer to right after
   * signup completes; log-in and plain dismiss burn it immediately.
   */
  markSkippedWithoutStarting: (options?: { pendingSignup?: boolean }) => {
    if (options?.pendingSignup) {
      markShowcaseOfferPending();
      return;
    }
    markShortcutShowcaseSeen();
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

export const selectShowcaseConfirmingSkip = (state: ShortcutShowcaseState) =>
  state.isConfirmingSkip;

export const selectShowcaseHasShownSkipConfirm = (
  state: ShortcutShowcaseState,
) => state.hasShownSkipConfirm;
