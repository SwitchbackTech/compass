import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type EventJumpState = {
  isActive: boolean;
  /** YYYY-MM-DD keys for highlighted day column(s). */
  activeDayKeys: string[];
  /** Polite live-region message for mode / day selection. */
  announcement: string;
};

export const initialEventJumpState: EventJumpState = {
  isActive: false,
  activeDayKeys: [],
  announcement: "",
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
  reset: () =>
    useEventJumpStore.setState(initialEventJumpState, false, { type: "reset" }),
};

export const selectEventJumpActive = (state: EventJumpState) => state.isActive;

export const selectEventJumpActiveDayKeys = (state: EventJumpState) =>
  state.activeDayKeys;

export const selectEventJumpAnnouncement = (state: EventJumpState) =>
  state.announcement;
