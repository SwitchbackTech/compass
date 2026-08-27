import { type RefObject } from "react";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const MONTH_PICKER_PREV_HOTKEY = "Mod+Shift+J";
export const MONTH_PICKER_NEXT_HOTKEY = "Mod+Shift+K";

export const MONTH_PICKER_PREV_KEYCAPS = ["Mod", "Shift", "J"] as const;
export const MONTH_PICKER_NEXT_KEYCAPS = ["Mod", "Shift", "K"] as const;

/** Remaining keys once Mod is already held (hold-Mod hint chips). */
export const MONTH_PICKER_PREV_HOLD_KEYCAPS = ["Shift", "J"] as const;
export const MONTH_PICKER_NEXT_HOLD_KEYCAPS = ["Shift", "K"] as const;

const PREV_MONTH_LABEL = "Previous month";
const NEXT_MONTH_LABEL = "Next month";

/**
 * Mod+Shift+J / Mod+Shift+K step the sidebar month picker's displayed month
 * the same way the chevrons do. Registered only while the picker is mounted.
 */
export function useMonthPickerShortcuts(
  rootRef: RefObject<HTMLElement | null>,
) {
  const clickNav = (ariaLabel: string) => {
    rootRef.current
      ?.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`)
      ?.click();
  };

  useAppShortcut(MONTH_PICKER_PREV_HOTKEY, () => clickNav(PREV_MONTH_LABEL), {
    ignoreInputs: true,
  });
  useAppShortcut(MONTH_PICKER_NEXT_HOTKEY, () => clickNav(NEXT_MONTH_LABEL), {
    ignoreInputs: true,
  });
}
