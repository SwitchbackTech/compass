import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type EditSequenceState = {
  /** True from the leader keypress until a second key, Escape, or a cancel. */
  isArmed: boolean;
  /** True once the silent fast-path window elapses without a second key. */
  isMenuVisible: boolean;
};

export const initialEditSequenceState: EditSequenceState = {
  isArmed: false,
  isMenuVisible: false,
};

export const useEditSequenceStore = create<EditSequenceState>()(
  devtools(() => initialEditSequenceState, {
    name: "compass/edit-sequence",
    enabled: IS_DEV,
  }),
);

export const editSequenceActions = {
  arm: () =>
    useEditSequenceStore.setState(
      { isArmed: true, isMenuVisible: false },
      false,
      { type: "arm" },
    ),
  /** Fast-path window elapsed: reveal the second-key menu and stay armed. */
  showMenu: () =>
    useEditSequenceStore.setState({ isMenuVisible: true }, false, {
      type: "showMenu",
    }),
  disarm: () =>
    useEditSequenceStore.setState(initialEditSequenceState, false, {
      type: "disarm",
    }),
};

export const selectEditSequenceMenuVisible = (state: EditSequenceState) =>
  state.isMenuVisible;
