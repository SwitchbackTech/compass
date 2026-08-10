import { focusEventFormField } from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

/**
 * Mod+Shift+letter → jump focus directly to a form field while typing
 * anywhere in the event form (title, location, TipTap description). All
 * chosen letters are page-interceptable browser bindings
 * (reopen-closed-tab/devtools/reload/bookmark), suppressed here via
 * preventDefault + stopPropagation.
 */
const JUMP_HOTKEY_OPTIONS = {
  enabled: true,
  ignoreInputs: false,
  preventDefault: true,
  stopPropagation: true,
} as const;

export function useEventFormFieldJumpShortcuts() {
  useAppShortcut(
    "Mod+Shift+I",
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
    "Mod+Shift+R",
    () => focusEventFormField("recurrence"),
    JUMP_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "Mod+Shift+C",
    () => focusEventFormField("calendar"),
    JUMP_HOTKEY_OPTIONS,
  );
}
