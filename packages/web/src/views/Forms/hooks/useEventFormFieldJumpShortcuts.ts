import { resolveModifier } from "@tanstack/react-hotkeys";
import { useEffect } from "react";
import { focusEventFormField } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import {
  EDIT_SEQUENCE_FIELDS,
  type EditSequenceSecondKey,
} from "@web/shortcuts/useEditSequenceShortcut";

const ARM_WINDOW_MS = 600;

const hasModifier = (event: KeyboardEvent) =>
  event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

/**
 * Mod+E arms, then a bare `t`/`l`/`d`/`s`/`e`/`r`/`c` jumps focus directly to
 * the matching form field - the same letters and field mapping as the grid's
 * `e`-then-letter sequence (EDIT_SEQUENCE_FIELDS), so there's one "e means
 * edit a field" mental model. Unlike the grid sequence, this one fires while
 * focus is already inside a form input or the TipTap description - that's
 * the point, so it does not bail on editable targets.
 */
export function useEventFormFieldJumpShortcuts() {
  useEffect(() => {
    const isMac = resolveModifier("Mod") === "Meta";
    let armedUntil = 0;
    let armTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const suppressKeyUp = new Set<string>();

    const disarm = () => {
      armedUntil = 0;
      if (armTimeoutId !== null) {
        clearTimeout(armTimeoutId);
        armTimeoutId = null;
      }
    };

    const arm = () => {
      disarm();
      armedUntil = Date.now() + ARM_WINDOW_MS;
      armTimeoutId = setTimeout(() => {
        armedUntil = 0;
        armTimeoutId = null;
      }, ARM_WINDOW_MS);
    };

    const isArmed = () => armedUntil > Date.now();

    const isLeaderKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "e") return false;
      if (event.shiftKey || event.altKey) return false;
      return isMac
        ? event.metaKey && !event.ctrlKey
        : event.ctrlKey && !event.metaKey;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isAppLocked()) {
        disarm();
        return;
      }

      if (isLeaderKeydown(event)) {
        event.preventDefault();
        event.stopPropagation();
        arm();
        return;
      }

      if (!isArmed()) return;

      if (hasModifier(event)) {
        disarm();
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const field =
        key in EDIT_SEQUENCE_FIELDS
          ? EDIT_SEQUENCE_FIELDS[key as EditSequenceSecondKey]
          : null;

      if (field) {
        event.preventDefault();
        event.stopPropagation();
        suppressKeyUp.add(key);
        disarm();
        focusEventFormField(field);
        return;
      }

      // Unknown second key: disarm silently and let the key through.
      disarm();
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
