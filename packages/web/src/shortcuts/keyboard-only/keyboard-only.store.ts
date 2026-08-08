import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type KeyboardOnlyState = {
  isActive: boolean;
  /** Increments when a click is blocked so the indicator can pulse. */
  blockedClickPulse: number;
};

export const initialKeyboardOnlyState: KeyboardOnlyState = {
  isActive: false,
  blockedClickPulse: 0,
};

export const useKeyboardOnlyStore = create<KeyboardOnlyState>()(
  devtools(() => initialKeyboardOnlyState, {
    name: "compass/keyboard-only",
    enabled: IS_DEV,
  }),
);

export const keyboardOnlyActions = {
  enter: () =>
    useKeyboardOnlyStore.setState({ isActive: true }, false, {
      type: "enter",
    }),
  exit: () =>
    useKeyboardOnlyStore.setState(
      { isActive: false, blockedClickPulse: 0 },
      false,
      { type: "exit" },
    ),
  pulseBlockedClick: () =>
    useKeyboardOnlyStore.setState(
      (state) => ({ blockedClickPulse: state.blockedClickPulse + 1 }),
      false,
      { type: "pulseBlockedClick" },
    ),
};

export const selectKeyboardOnlyActive = (state: KeyboardOnlyState) =>
  state.isActive;

export const selectKeyboardOnlyPulse = (state: KeyboardOnlyState) =>
  state.blockedClickPulse;
