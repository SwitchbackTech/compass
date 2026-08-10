import {
  type EventFormFocusField,
  focusEventFormField,
} from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

/**
 * Mod+Shift+letter → field map for jumping focus directly to a form field
 * while typing anywhere in the event form (title, location, TipTap
 * description). All chosen letters are page-interceptable browser bindings
 * (reopen-closed-tab/devtools/reload/bookmark), suppressed here via
 * preventDefault + stopPropagation.
 */
export const EVENT_FORM_FIELD_JUMP_SHORTCUTS = {
  "Mod+Shift+I": "title",
  "Mod+Shift+L": "location",
  "Mod+Shift+D": "description",
  "Mod+Shift+S": "start",
  "Mod+Shift+E": "end",
  "Mod+Shift+R": "recurrence",
  "Mod+Shift+C": "calendar",
} as const satisfies Record<string, EventFormFocusField>;

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
