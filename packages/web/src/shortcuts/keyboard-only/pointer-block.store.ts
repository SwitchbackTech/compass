import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type PointerBlockState = {
  /** Increments when a click is blocked so the pointer hint can show. */
  blockedClickPulse: number;
};

export const initialPointerBlockState: PointerBlockState = {
  blockedClickPulse: 0,
};

export const usePointerBlockStore = create<PointerBlockState>()(
  devtools(() => initialPointerBlockState, {
    name: "compass/pointer-block",
    enabled: IS_DEV,
  }),
);

export const pointerBlockActions = {
  pulseBlockedClick: () =>
    usePointerBlockStore.setState(
      (state) => ({ blockedClickPulse: state.blockedClickPulse + 1 }),
      false,
      { type: "pulseBlockedClick" },
    ),
};

export const selectPointerBlockPulse = (state: PointerBlockState) =>
  state.blockedClickPulse;
