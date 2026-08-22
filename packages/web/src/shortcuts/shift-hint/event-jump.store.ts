import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type EventJumpState = {
  isActive: boolean;
  /** YYYY-MM-DD keys for highlighted day column(s). */
  activeDayKeys: string[];
  /** Polite live-region message for mode / day selection. */
  announcement: string;
  /** Assignment surfaced after a blocked click selects a specific event. */
  pointerHintKey: string | null;
};

export const initialEventJumpState: EventJumpState = {
  isActive: false,
  activeDayKeys: [],
  announcement: "",
  pointerHintKey: null,
};

export const useEventJumpStore = create<EventJumpState>()(
  devtools(() => initialEventJumpState, {
    name: "compass/event-jump",
    enabled: IS_DEV,
  }),
);

export const eventJumpActions = {
  setActive: (isActive: boolean) =>
    useEventJumpStore.setState(
      {
        isActive,
        activeDayKeys: isActive
          ? useEventJumpStore.getState().activeDayKeys
          : [],
        announcement: isActive ? "Event jump on" : "Event jump off",
        pointerHintKey: isActive
          ? useEventJumpStore.getState().pointerHintKey
          : null,
      },
      false,
      { type: "setActive" },
    ),
  /** Clear a lingering exit announcement after the live region has spoken. */
  clearAnnouncement: () =>
    useEventJumpStore.setState({ announcement: "" }, false, {
      type: "clearAnnouncement",
    }),
  setActiveDayKeys: (activeDayKeys: string[], announcement?: string) =>
    useEventJumpStore.setState(
      {
        activeDayKeys,
        ...(announcement !== undefined ? { announcement } : {}),
      },
      false,
      { type: "setActiveDayKeys" },
    ),
  setPointerHintKey: (pointerHintKey: string | null) =>
    useEventJumpStore.setState({ pointerHintKey }, false, {
      type: "setPointerHintKey",
    }),
  reset: () =>
    useEventJumpStore.setState(initialEventJumpState, false, { type: "reset" }),
};

export const selectEventJumpActive = (state: EventJumpState) => state.isActive;

/** Imperative read for plain event handlers outside React, mirroring
 * `isEditSequenceArmed` so the two keyboard modes can yield to each other. */
export const isEventJumpActive = () => useEventJumpStore.getState().isActive;

export const selectEventJumpActiveDayKeys = (state: EventJumpState) =>
  state.activeDayKeys;

export const selectEventJumpAnnouncement = (state: EventJumpState) =>
  state.announcement;

export const selectEventJumpPointerHintKey = (state: EventJumpState) =>
  state.pointerHintKey;
