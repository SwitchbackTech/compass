import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";
import { type BlockedPointerAttempt } from "@web/shortcuts/keyboard-only/pointer-action";

export type PointerBlockState = {
  /** Increments when a click is blocked so the pointer hint can show. */
  blockedClickPulse: number;
  /** Semantic intent of the latest blocked pointerdown. */
  latestAttempt: BlockedPointerAttempt | null;
};

export const initialPointerBlockState: PointerBlockState = {
  blockedClickPulse: 0,
  latestAttempt: null,
};

export const usePointerBlockStore = create<PointerBlockState>()(
  devtools(() => initialPointerBlockState, {
    name: "compass/pointer-block",
    enabled: IS_DEV,
  }),
);

export const pointerBlockActions = {
  pulseBlockedClick: (
    attempt: BlockedPointerAttempt = { actionId: "unknown" },
  ) =>
    usePointerBlockStore.setState(
      (state) => ({
        blockedClickPulse: state.blockedClickPulse + 1,
        latestAttempt: attempt,
      }),
      false,
      { type: "pulseBlockedClick" },
    ),
};

export const selectPointerBlockPulse = (state: PointerBlockState) =>
  state.blockedClickPulse;

export const selectLatestPointerAttempt = (state: PointerBlockState) =>
  state.latestAttempt;
