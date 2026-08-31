import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

/**
 * Which surface armed the leader. One store rather than one per surface, so a
 * sequence armed in the booking form cannot leave a menu pinned over the grid;
 * the menu renders only for its own scope.
 */
export type EditSequenceScope = "event" | "booking";

export type EditSequenceState = {
  /** True from the leader keypress until a second key, Escape, or a cancel. */
  isArmed: boolean;
  /** True once the silent fast-path window elapses without a second key. */
  isMenuVisible: boolean;
  scope: EditSequenceScope | null;
};

export const initialEditSequenceState: EditSequenceState = {
  isArmed: false,
  isMenuVisible: false,
  scope: null,
};

export const useEditSequenceStore = create<EditSequenceState>()(
  devtools(() => initialEditSequenceState, {
    name: "compass/edit-sequence",
    enabled: IS_DEV,
  }),
);

export const editSequenceActions = {
  arm: (scope: EditSequenceScope = "event") =>
    useEditSequenceStore.setState(
      { isArmed: true, isMenuVisible: false, scope },
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

export const selectEditSequenceScope = (state: EditSequenceState) =>
  state.scope;
