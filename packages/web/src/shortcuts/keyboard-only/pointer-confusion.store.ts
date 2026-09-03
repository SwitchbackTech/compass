import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type BlockedPointerAttempt } from "@web/shortcuts/keyboard-only/pointer-action";
import {
  readPointerHintDismissedPermanently,
  readPointerHintLastShownAt,
  readPointerHintLifetimeCount,
  writePointerHintDismissedPermanently,
  writePointerHintLastShownAt,
  writePointerHintLifetimeCount,
} from "@web/shortcuts/keyboard-only/pointer-hint.storage";

export const POINTER_CONFUSION_THRESHOLD = 4;
export const POINTER_CONFUSION_LIFETIME_LIMIT = 3;
export const POINTER_CONFUSION_MIN_GAP_MS = 10_000;
export const POINTER_CONFUSION_DECAY_INTERVAL_MS = 20_000;
export const POINTER_CONFUSION_REGION_RADIUS_PX = 48;
export const POINTER_CONFUSION_REGION_WINDOW_MS = 3_000;

type PointerConfusionState = {
  score: number;
  hintPulse: number;
  deadClickPulse: number;
  latestAttempt: BlockedPointerAttempt | null;
};

const initialState: PointerConfusionState = {
  score: 0,
  hintPulse: 0,
  deadClickPulse: 0,
  latestAttempt: null,
};

export const usePointerConfusionStore = create<PointerConfusionState>()(
  devtools(() => ({ ...initialState }), { name: "pointer-confusion" }),
);

const canShowPointerHint = () => {
  if (readPointerHintDismissedPermanently()) return false;
  if (readPointerHintLifetimeCount() >= POINTER_CONFUSION_LIFETIME_LIMIT) {
    return false;
  }
  const lastShownAt = readPointerHintLastShownAt();
  if (
    lastShownAt !== null &&
    Date.now() - lastShownAt < POINTER_CONFUSION_MIN_GAP_MS
  ) {
    return false;
  }
  return true;
};

const markPointerHintShown = () => {
  writePointerHintLifetimeCount(readPointerHintLifetimeCount() + 1);
  writePointerHintLastShownAt(Date.now());
};

const adjustScore = (delta: number) => {
  const nextScore = Math.max(
    0,
    usePointerConfusionStore.getState().score + delta,
  );
  usePointerConfusionStore.setState({ score: nextScore }, false, {
    type: "adjustScore",
    delta,
  });

  if (nextScore >= POINTER_CONFUSION_THRESHOLD && canShowPointerHint()) {
    markPointerHintShown();
    usePointerConfusionStore.setState(
      (state) => ({
        score: 0,
        hintPulse: state.hintPulse + 1,
      }),
      false,
      { type: "triggerHint" },
    );
  }
};

export const pointerConfusionActions = {
  resetForTests: () => {
    usePointerConfusionStore.setState(initialState, false, {
      type: "resetForTests",
    });
  },
  recordDeadClick: (attempt: BlockedPointerAttempt) => {
    usePointerConfusionStore.setState(
      (state) => ({
        latestAttempt: attempt,
        deadClickPulse: state.deadClickPulse + 1,
      }),
      false,
      { type: "recordDeadClick" },
    );
    adjustScore(1);
  },
  recordRegionBurst: (attempt: BlockedPointerAttempt) => {
    usePointerConfusionStore.setState(
      (state) => ({
        latestAttempt: attempt,
        deadClickPulse: state.deadClickPulse + 1,
      }),
      false,
      { type: "recordRegionBurst" },
    );
    adjustScore(2);
  },
  recordTextSelection: () => adjustScore(-1),
  recordCopyButtonClick: () => adjustScore(-1),
  recordKeyboardSuccess: () => adjustScore(-2),
  decayScore: () => adjustScore(-1),
  dismissPermanently: () => {
    writePointerHintDismissedPermanently();
    usePointerConfusionStore.setState({ score: 0 }, false, {
      type: "dismissPermanently",
    });
  },
  /** Test helper: show the hint with a specific attempt context. */
  triggerHintForTests: (attempt: BlockedPointerAttempt) => {
    usePointerConfusionStore.setState(
      (state) => ({
        latestAttempt: attempt,
        hintPulse: state.hintPulse + 1,
      }),
      false,
      { type: "triggerHintForTests" },
    );
  },
};

export const selectPointerConfusionHintPulse = (state: PointerConfusionState) =>
  state.hintPulse;

export const selectPointerConfusionAttempt = (state: PointerConfusionState) =>
  state.latestAttempt;

export const selectPointerConfusionDeadClickPulse = (
  state: PointerConfusionState,
) => state.deadClickPulse;

export const selectPointerConfusionScore = (state: PointerConfusionState) =>
  state.score;
