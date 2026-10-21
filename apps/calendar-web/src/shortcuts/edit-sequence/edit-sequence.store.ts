import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { EDIT_SEQUENCE_LETTER_FIELDS } from "@core/shortcuts/edit-sequence.fields";
import { IS_DEV } from "@web/common/constants/env.constants";

/**
 * Which surface armed the leader. Booking settings no longer use this store.
 */
export type EditSequenceScope = "event";

export type EditSequenceMenuLetterField = {
  key: string;
  label: string;
};

export type EditSequenceState = {
  /** True from the leader keypress until a second key, Escape, or a cancel. */
  isArmed: boolean;
  /** True once the silent fast-path window elapses without a second key. */
  isMenuVisible: boolean;
  scope: EditSequenceScope | null;
  /** Snapshot of menu rows at arm time (focus may not have re-rendered the tree). */
  menuLetterFields: readonly EditSequenceMenuLetterField[];
};

export const initialEditSequenceState: EditSequenceState = {
  isArmed: false,
  isMenuVisible: false,
  scope: null,
  menuLetterFields: EDIT_SEQUENCE_LETTER_FIELDS,
};

export const useEditSequenceStore = create<EditSequenceState>()(
  devtools(() => initialEditSequenceState, {
    name: "compass/edit-sequence",
    enabled: IS_DEV,
  }),
);

export const editSequenceActions = {
  arm: (
    scope: EditSequenceScope = "event",
    menuLetterFields: readonly EditSequenceMenuLetterField[] = EDIT_SEQUENCE_LETTER_FIELDS,
  ) =>
    useEditSequenceStore.setState(
      { isArmed: true, isMenuVisible: false, scope, menuLetterFields },
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

export const selectEditSequenceMenuLetterFields = (state: EditSequenceState) =>
  state.menuLetterFields;
