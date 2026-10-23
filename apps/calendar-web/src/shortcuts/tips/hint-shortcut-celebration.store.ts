import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type HintShortcutCelebrationKey } from "@core/shortcuts/hint-shortcut-celebration.util";
import { IS_DEV } from "@web/common/constants/env.constants";

export const HINT_SHORTCUT_CELEBRATION_MS = 600;

type HintShortcutCelebrationState = {
  pulse: number;
  activeKey: HintShortcutCelebrationKey | null;
};

const initialState: HintShortcutCelebrationState = {
  pulse: 0,
  activeKey: null,
};

export const useHintShortcutCelebrationStore =
  create<HintShortcutCelebrationState>()(
    devtools(() => initialState, {
      name: "compass/hintShortcutCelebration",
      enabled: IS_DEV,
    }),
  );

let clearTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

export const hintShortcutCelebrationActions = {
  pulse: (key: HintShortcutCelebrationKey) => {
    if (clearTimer !== undefined) globalThis.clearTimeout(clearTimer);
    useHintShortcutCelebrationStore.setState(
      (state) => ({
        pulse: state.pulse + 1,
        activeKey: key,
      }),
      false,
      { type: "pulse" },
    );
    clearTimer = globalThis.setTimeout(() => {
      clearTimer = undefined;
      useHintShortcutCelebrationStore.setState({ activeKey: null }, false, {
        type: "clear",
      });
    }, HINT_SHORTCUT_CELEBRATION_MS);
  },
};

export const resetHintShortcutCelebrationTimerForTests = (): void => {
  if (clearTimer !== undefined) {
    globalThis.clearTimeout(clearTimer);
    clearTimer = undefined;
  }
  useHintShortcutCelebrationStore.setState(initialState, true);
};

export const selectHintShortcutCelebrationPulse = (
  state: HintShortcutCelebrationState,
) => state.pulse;

export const selectHintShortcutCelebrationKey = (
  state: HintShortcutCelebrationState,
) => state.activeKey;
