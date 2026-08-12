import { resolveModifier } from "@tanstack/react-hotkeys";
import { useEffect, useRef } from "react";
import {
  type EventFormFocusField,
  isEditableKeyboardTarget,
} from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import {
  EDIT_SEQUENCE_FIELD_BY_KEY,
  type EditSequenceSecondKey,
} from "@web/shortcuts/edit-sequence/edit-sequence.fields";
import {
  editSequenceActions,
  useEditSequenceStore,
} from "@web/shortcuts/edit-sequence/edit-sequence.store";
import { isBareLetterKey } from "@web/shortcuts/is-bare-letter-key";

/**
 * How long the leader stays silent. A second key inside this window fires with
 * no UI at all (muscle memory); past it the which-key menu opens and the
 * sequence stays armed until the user picks or cancels.
 */
const ARM_WINDOW_MS = 600;
const LEADER_KEY = "e";

/** Shared so other letter shortcuts (e.g. event-jump `s`) can yield to `e`… sequences. */
export const isEditSequenceArmed = () =>
  useEditSequenceStore.getState().isArmed;

/** Test helper: clear the shared arm state. */
export const resetEditSequenceArm = () => {
  editSequenceActions.disarm();
};

/** Any modifier at all, used to reject chords as the *second* key. */
const hasModifier = (event: KeyboardEvent) =>
  event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

const normalizeKey = (event: KeyboardEvent) =>
  event.key.length === 1 ? event.key.toLowerCase() : event.key;

/**
 * The single owner of both edit leaders.
 *
 * Bare `e` is the grid fast path and bails on editable targets, so typing "e"
 * in the title does nothing. `Mod+E` is the same leader for use while the caret
 * is already inside the form, so it deliberately does not bail on editable
 * targets. Both land in the same arm/dispatch path, which is why this is one
 * listener rather than two: a second listener claiming `Mod+E` would fire the
 * sequence twice.
 *
 * Capture-phase listeners suppress the follow key's keyup so existing keyup
 * shortcuts (e.g. `t` → today, `d` → day view) do not also run.
 */
export function useEditSequenceShortcut({
  canArm,
  onSequence,
}: {
  /** Gate arming on there being something to edit, so a stray `e` does not
   * swallow the next keystroke. */
  canArm?: () => boolean;
  onSequence: (field: EventFormFocusField) => void;
}) {
  const onSequenceRef = useRef(onSequence);
  onSequenceRef.current = onSequence;
  const canArmRef = useRef(canArm);
  canArmRef.current = canArm;

  useEffect(() => {
    const isMac = resolveModifier("Mod") === "Meta";
    let menuTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const suppressKeyUp = new Set<string>();

    const disarm = () => {
      if (menuTimeoutId !== null) {
        clearTimeout(menuTimeoutId);
        menuTimeoutId = null;
      }
      editSequenceActions.disarm();
    };

    const arm = () => {
      disarm();
      editSequenceActions.arm();
      menuTimeoutId = setTimeout(() => {
        menuTimeoutId = null;
        if (isEditSequenceArmed()) {
          editSequenceActions.showMenu();
        }
      }, ARM_WINDOW_MS);
    };

    const isModLeader = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== LEADER_KEY) return false;
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

      if (isEditSequenceArmed()) {
        if (event.key === "Escape") {
          disarm();
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // The second key must be bare; a chord means the user moved on.
        if (hasModifier(event)) {
          disarm();
          return;
        }

        const key = normalizeKey(event);
        const field =
          key in EDIT_SEQUENCE_FIELD_BY_KEY
            ? EDIT_SEQUENCE_FIELD_BY_KEY[key as EditSequenceSecondKey]
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

      // Mod+E works anywhere, including inside the form's inputs. Bare `e` only
      // outside them, or it would eat the letter you meant to type.
      const isMod = isModLeader(event);
      const isLeader =
        isMod ||
        (isBareLetterKey(event, LEADER_KEY) &&
          !isEditableKeyboardTarget(event));

      if (!isLeader) return;
      if (canArmRef.current && !canArmRef.current()) return;

      if (isMod) {
        event.preventDefault();
        event.stopPropagation();
      }
      arm();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = normalizeKey(event);
      if (!suppressKeyUp.has(key)) return;

      suppressKeyUp.delete(key);
      event.preventDefault();
      event.stopPropagation();
    };

    // Clicking or tabbing away abandons the sequence rather than leaving a
    // menu pinned to an event the user is no longer looking at.
    const onPointerDown = () => disarm();
    const onWindowBlur = () => disarm();

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      disarm();
      suppressKeyUp.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);
}
