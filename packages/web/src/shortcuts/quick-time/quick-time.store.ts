import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type QuickTimeState = {
  /** Digits typed toward a start time so far; "" when idle. */
  digits: string;
};

export const initialQuickTimeState: QuickTimeState = { digits: "" };

export const useQuickTimeStore = create<QuickTimeState>()(
  devtools(() => initialQuickTimeState, {
    name: "compass/quick-time",
    enabled: IS_DEV,
  }),
);

export const quickTimeActions = {
  setDigits: (digits: string) =>
    useQuickTimeStore.setState({ digits }, false, { type: "setDigits" }),
  clear: () => {
    if (useQuickTimeStore.getState().digits === "") return;
    useQuickTimeStore.setState(initialQuickTimeState, false, { type: "clear" });
  },
};

export const selectQuickTimeDigits = (state: QuickTimeState) => state.digits;
