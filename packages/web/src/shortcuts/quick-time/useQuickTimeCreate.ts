import { useCallback, useEffect, useRef } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isEventFormOpen } from "@web/events/stores/draft.store";
import { isAppLocked } from "@web/shortcuts/app-lock";
import {
  digitPickIndex,
  PICK_KEY_LABELS,
} from "@web/shortcuts/digit-pick.util";
import { isFloatingLayerOpen } from "@web/shortcuts/floating-layer";
import { quickTimeActions } from "@web/shortcuts/quick-time/quick-time.store";
import {
  canQuickTimeBufferGrow,
  resolveQuickTimeStart,
} from "@web/shortcuts/quick-time/quick-time.util";
import { DIGIT_AMBIGUOUS_COMMIT_MS } from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";

/** Digit keys only: PICK_KEY_LABELS' last two entries are "-" and "=". */
const DIGIT_PICK_COUNT = 10;

const MODIFIER_KEYS = new Set(["Alt", "Control", "Meta", "Shift"]);

export type QuickTimeConsumer = {
  /** True when the key was consumed and must not reach another handler. */
  tryConsumeKey: (event: KeyboardEvent) => boolean;
};

/**
 * Buffers a typed digit sequence ("1130") and creates a timed draft at that
 * time on `getTargetDay()`.
 *
 * The keystrokes arrive from useShiftHoldEventHints' capture listener rather
 * than a second document listener of our own: both features read bare digits,
 * and one listener with an explicit precedence rule beats two whose order
 * depends on React mount order. This hook lives with the view owner instead,
 * because that is the only place that knows which day a draft should land on.
 *
 * Commit timing mirrors the event-jump digit buffer (DIGIT_AMBIGUOUS_COMMIT_MS)
 * so the two feel the same: "1130" commits on the 4th digit, "9" commits once
 * the window lapses, Enter commits now, Escape abandons.
 */
export function useQuickTimeCreate({
  createAt,
  getTargetDay,
}: {
  createAt: (start: Dayjs) => void;
  getTargetDay: () => Dayjs;
}): QuickTimeConsumer {
  const digitsRef = useRef("");
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createAtRef = useRef(createAt);
  const getTargetDayRef = useRef(getTargetDay);

  createAtRef.current = createAt;
  getTargetDayRef.current = getTargetDay;

  const clearCommitTimer = useCallback(() => {
    if (commitTimerRef.current === null) return;
    clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearCommitTimer();
    digitsRef.current = "";
    quickTimeActions.clear();
  }, [clearCommitTimer]);

  const commit = useCallback(() => {
    const digits = digitsRef.current;
    reset();
    if (!digits) return;

    const now = dayjs().tz(getEffectiveTimeZone());
    const start = resolveQuickTimeStart(digits, now, getTargetDayRef.current());
    if (!start) return;

    // The slot placeholders have answered their question, and leaving them up
    // would strew chips across the draft that just arrived. Dropped before the
    // create so both land in one commit rather than flashing chips over it.
    eventJumpActions.setActive(false);
    createAtRef.current(start);
  }, [reset]);

  useEffect(() => reset, [reset]);

  const tryConsumeKey = useCallback(
    (event: KeyboardEvent): boolean => {
      // A bare Shift keydown precedes every digit on layouts where the top row
      // is shifted, so it must never count as abandoning the buffer.
      if (MODIFIER_KEYS.has(event.key)) return false;

      // isEditableKeyboardTarget misses role-less buttons (the closed
      // CalendarSelect trigger) and the context menu's color row, so the form
      // and floating-layer checks carry those. isEditSequenceArmed yields to a
      // half-typed `e`… sequence, which disarms only on keys it sees itself.
      if (
        isAppLocked() ||
        isEditableKeyboardTarget(event) ||
        isEventFormOpen() ||
        isFloatingLayerOpen() ||
        isEditSequenceArmed()
      ) {
        reset();
        return false;
      }

      const buffered = digitsRef.current !== "";

      if (event.key === "Escape") {
        if (!buffered) return false;
        reset();
        return true;
      }

      if (event.key === "Enter") {
        if (!buffered) return false;
        commit();
        return true;
      }

      const pickIndex = digitPickIndex(event);
      if (pickIndex === null || pickIndex >= DIGIT_PICK_COUNT) {
        // Anything else abandons a half-typed time but still runs its own
        // command, so `11` then `h` still toggles event jump.
        if (buffered) reset();
        return false;
      }

      const next = `${digitsRef.current}${PICK_KEY_LABELS[pickIndex]}`;
      digitsRef.current = next;
      quickTimeActions.setDigits(next);

      if (!canQuickTimeBufferGrow(next)) {
        commit();
        return true;
      }

      clearCommitTimer();
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        if (digitsRef.current !== next) return;
        commit();
      }, DIGIT_AMBIGUOUS_COMMIT_MS);

      return true;
    },
    [clearCommitTimer, commit, reset],
  );

  return { tryConsumeKey };
}
