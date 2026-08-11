import { useEffect, useRef } from "react";
import {
  type EventFormFocusField,
  isEditableKeyboardTarget,
} from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";

/** Leader → field map for the `e` edit sequences. */
export const EDIT_SEQUENCE_FIELDS = {
  t: "title",
  l: "location",
  d: "description",
  s: "start",
  e: "end",
  r: "recurrence",
  c: "calendar",
} as const satisfies Record<string, EventFormFocusField>;

export type EditSequenceSecondKey = keyof typeof EDIT_SEQUENCE_FIELDS;

const ARM_WINDOW_MS = 600;
const LEADER_KEY = "e";

/** Shared so other letter shortcuts (e.g. event-jump `s`) can yield to `e`… sequences. */
let editSequenceArmedUntil = 0;

export const isEditSequenceArmed = () => editSequenceArmedUntil > Date.now();

/** Test helper: clear the shared arm window. */
export const resetEditSequenceArm = () => {
  editSequenceArmedUntil = 0;
};

const hasModifier = (event: KeyboardEvent) =>
  event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

/**
 * Arms on bare `e`, then fires a mapped second key within a short window.
 * Capture-phase listeners suppress the follow key's keyup so existing keyup
 * shortcuts (e.g. `t` → today, `d` → day view) do not also run.
 */
export function useEditSequenceShortcut({
  onSequence,
}: {
  onSequence: (field: EventFormFocusField) => void;
}) {
  const onSequenceRef = useRef(onSequence);
  onSequenceRef.current = onSequence;

  useEffect(() => {
    let armTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const suppressKeyUp = new Set<string>();

    const disarm = () => {
      editSequenceArmedUntil = 0;
      if (armTimeoutId !== null) {
        clearTimeout(armTimeoutId);
        armTimeoutId = null;
      }
    };

    const arm = () => {
      disarm();
      editSequenceArmedUntil = Date.now() + ARM_WINDOW_MS;
      armTimeoutId = setTimeout(() => {
        editSequenceArmedUntil = 0;
        armTimeoutId = null;
      }, ARM_WINDOW_MS);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isAppLocked()) {
        disarm();
        return;
      }
      if (isEditableKeyboardTarget(event)) {
        disarm();
        return;
      }
      if (hasModifier(event)) {
        disarm();
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (isEditSequenceArmed()) {
        const field =
          key in EDIT_SEQUENCE_FIELDS
            ? EDIT_SEQUENCE_FIELDS[key as EditSequenceSecondKey]
            : null;

        if (field) {
          event.preventDefault();
          event.stopPropagation();
          suppressKeyUp.add(key);
          disarm();
          onSequenceRef.current(field);
          return;
        }

        // Unknown second key: disarm silently and let the key through.
        disarm();
        return;
      }

      if (key === LEADER_KEY) {
        arm();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!suppressKeyUp.has(key)) return;

      suppressKeyUp.delete(key);
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);

    return () => {
      disarm();
      suppressKeyUp.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);
}
