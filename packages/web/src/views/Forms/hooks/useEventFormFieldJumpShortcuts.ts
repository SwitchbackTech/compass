import { focusEventFormField } from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

/**
 * Mod+Shift+letter → jump focus directly to a form field while typing
 * anywhere in the event form (title, location, TipTap description).
 * Letters avoid OS/browser-chrome shortcuts (reload, DevTools, inspect
 * element, reopen-closed-tab, etc.) that fire before page JS ever sees the
 * keydown and so can't be suppressed by preventDefault/stopPropagation.
 */
const JUMP_HOTKEY_OPTIONS = {
  enabled: true,
  ignoreInputs: false,
  preventDefault: true,
  stopPropagation: true,
} as const;

export function useEventFormFieldJumpShortcuts() {
  useAppShortcut(
    "Mod+Shift+H",
    () => focusEventFormField("title"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+L",
    () => focusEventFormField("location"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+D",
    () => focusEventFormField("description"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+S",
    () => focusEventFormField("start"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+E",
    () => focusEventFormField("end"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+X",
    () => focusEventFormField("recurrence"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+K",
    () => focusEventFormField("calendar"),
    JUMP_HOTKEY_OPTIONS,
  );
}
