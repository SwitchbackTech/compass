import { useEffect, useRef, useState } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import {
  isBareLetterKey,
  keyboardKey,
  normalizedKeyboardKey,
} from "@web/shortcuts/is-bare-letter-key";
import {
  POINTER_EVENT_JUMP_REQUEST,
  pointerEventJumpId,
} from "@web/shortcuts/keyboard-only/pointer-action";
import { KEYMAP } from "@web/shortcuts/keymap";
import { type QuickTimeConsumer } from "@web/shortcuts/quick-time/useQuickTimeCreate";
import {
  assignDayJumpKeys,
  type DayJumpAssignment,
  type DayJumpMatchResult,
  DIGIT_AMBIGUOUS_COMMIT_MS,
  dayJumpPrefixesForWeekdays,
  dayNameForPrefix,
  filterHintsByPrefix,
  matchDayJumpKeystroke,
} from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { createKeyupSwallow } from "@web/shortcuts/swallow-next-keyup";
import { shortcutHintProgressActions } from "@web/shortcuts/tips/shortcut-tips.progress.store";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";

export type ShiftHintFocusTarget = {
  eventId: string;
  eventType: "all-day" | "timed";
  element: HTMLElement;
};

export type ActiveShiftHint = DayJumpAssignment & {
  element: HTMLElement;
};

export type EventJumpHintsResult = {
  hints: ActiveShiftHint[];
};

const DAY_NAME_BY_PREFIX: Record<string, string> = {
  su: "Sunday",
  m: "Monday",
  t: "Tuesday",
  w: "Wednesday",
  r: "Thursday",
  f: "Friday",
  sa: "Saturday",
};

/**
 * Day columns are entered with Shift so they never race the bare-letter
 * commands they used to lose to (`t` today, `f` notice focus, `m` event menu).
 */
const isShiftedSingleChar = (event: KeyboardEvent) => {
  const key = keyboardKey(event);
  return (
    key.length === 1 &&
    event.shiftKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  );
};

const FALLBACK_SCHEDULE = {
  startMs: 0,
  dayKey: "1970-01-01",
  weekday: 0,
} as const;

type ScheduleMeta = {
  startMs: number;
  dayKey: string;
  weekday: number;
};

const scheduleMeta = (event: GridEvent): ScheduleMeta => {
  if (!event.startDate) return FALLBACK_SCHEDULE;
  const start = dayjs(event.startDate);
  return {
    startMs: start.valueOf(),
    dayKey: start.format(YEAR_MONTH_DAY_FORMAT),
    weekday: start.day(),
  };
};

const toActiveHints = (
  assignments: DayJumpAssignment[],
  visibleById: Map<string, ShiftHintFocusTarget>,
): ActiveShiftHint[] =>
  assignments.flatMap((assignment) => {
    const target = visibleById.get(assignment.eventId);
    if (!target) return [];
    return [{ ...assignment, element: target.element }];
  });

/** Assign day-jump keys for the currently registered grid targets. */
const buildDayJumpAssignments = (
  visible: ShiftHintFocusTarget[],
  events: GridEvent[],
): {
  assignments: DayJumpAssignment[];
  visibleById: Map<string, ShiftHintFocusTarget>;
} => {
  const scheduleById = new Map<string, ScheduleMeta>();
  for (const event of events) {
    if (!event._id) continue;
    scheduleById.set(event._id, scheduleMeta(event));
  }

  const targets = visible.map((target) => {
    const meta = scheduleById.get(target.eventId) ?? FALLBACK_SCHEDULE;
    return {
      eventId: target.eventId,
      eventType: target.eventType,
      startMs: meta.startMs,
      dayKey: meta.dayKey,
      weekday: meta.weekday,
    };
  });

  return {
    assignments: assignDayJumpKeys(targets),
    visibleById: new Map(visible.map((target) => [target.eventId, target])),
  };
};

/**
 * Press `h` to show day-prefix jump labels, or Shift+<day letter> to enter
 * jump mode straight onto that column (`Shift+W`, `Shift+S` then `u`/`a`).
 * Shift is what makes the day columns always available: bare `t`, `f`, and
 * `m` keep their own commands. Once jump mode is on, the labels are typed
 * bare (`w`, `w1`…) and win over global shortcuts. Esc exits, a second `h`
 * toggles off. `s` is only the Sunday/Saturday prefix.
 *
 * Day view uses the same scheme on the one date it shows, so a bare digit is
 * never an event label on an empty buffer in either view - that keystroke
 * belongs to `quickTime` instead, which this listener offers every key before
 * reading it as a jump label. Both features read bare digits, so they share one
 * listener with an explicit precedence rule rather than racing two whose order
 * would depend on React mount order.
 */
export function useShiftHoldEventHints({
  allDayEvents = [],
  focus,
  listVisible,
  quickTime,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  focus: (target: ShiftHintFocusTarget) => void;
  listVisible: () => ShiftHintFocusTarget[];
  quickTime?: QuickTimeConsumer;
  timedEvents: GridEvent[];
}): EventJumpHintsResult {
  const [hints, setHints] = useState<ActiveShiftHint[]>([]);
  const isActive = useEventJumpStore((state) => state.isActive);

  const isActiveRef = useRef(false);
  const bufferRef = useRef("");
  const assignmentsRef = useRef<DayJumpAssignment[]>([]);
  const visibleByIdRef = useRef<Map<string, ShiftHintFocusTarget>>(new Map());
  const ambiguousCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const focusRef = useRef(focus);
  const listVisibleRef = useRef(listVisible);
  const quickTimeRef = useRef(quickTime);
  const allDayEventsRef = useRef(allDayEvents);
  const timedEventsRef = useRef(timedEvents);
  const publishedPrefixesRef = useRef<string[]>([]);

  focusRef.current = focus;
  listVisibleRef.current = listVisible;
  quickTimeRef.current = quickTime;
  allDayEventsRef.current = allDayEvents;
  timedEventsRef.current = timedEvents;
  isActiveRef.current = isActive;

  useEffect(() => {
    const keyupSwallow = createKeyupSwallow();

    const clearAmbiguousCommitTimer = () => {
      if (ambiguousCommitTimerRef.current !== null) {
        clearTimeout(ambiguousCommitTimerRef.current);
        ambiguousCommitTimerRef.current = null;
      }
    };

    const clearHints = () => {
      clearAmbiguousCommitTimer();
      assignmentsRef.current = [];
      visibleByIdRef.current = new Map();
      bufferRef.current = "";
      setHints([]);
    };

    const rebuildAssignments = () => {
      // Label every registered event in the view (not only viewport cards) so
      // day indices stay stable while scrolling.
      const { assignments, visibleById } = buildDayJumpAssignments(
        listVisibleRef.current(),
        [...allDayEventsRef.current, ...timedEventsRef.current],
      );
      assignmentsRef.current = assignments;
      visibleByIdRef.current = visibleById;
      return assignments;
    };

    const publishFiltered = (buffer: string) => {
      const source = buffer
        ? filterHintsByPrefix(assignmentsRef.current, buffer)
        : assignmentsRef.current;
      setHints(toActiveHints(source, visibleByIdRef.current));
    };

    /** Drop trailing digits so the next index starts from the day prefix. */
    const stripDigitBuffer = () => {
      const dayPrefix = bufferRef.current.replace(/\d+$/, "");
      if (dayPrefix === bufferRef.current) return;
      bufferRef.current = dayPrefix;
      publishFiltered(dayPrefix);
    };

    // Activates even with nothing to label: the quick-time slot placeholders
    // are the whole point of `h` on an empty day.
    const activate = () => {
      if (isAppLocked()) return;
      const assignments = rebuildAssignments();
      isActiveRef.current = true;
      bufferRef.current = "";
      eventJumpActions.setActive(true);
      eventJumpActions.setActiveDayKeys([]);
      setHints(toActiveHints(assignments, visibleByIdRef.current));
    };

    const deactivate = () => {
      isActiveRef.current = false;
      bufferRef.current = "";
      clearHints();
      eventJumpActions.setActive(false);
    };

    const focusEvent = (eventId: string) => {
      const target = visibleByIdRef.current.get(eventId);
      if (!target) return;
      target.element.scrollIntoView({ block: "nearest" });
      focusRef.current(target);
    };

    const commitFocus = (eventId: string, dayKey: string, buffer: string) => {
      clearAmbiguousCommitTimer();
      eventJumpActions.setActiveDayKeys([dayKey]);
      focusEvent(eventId);
      // Keep the day prefix so the next digit indexes within the same day.
      const dayPrefix = buffer.replace(/\d+$/, "") || buffer;
      bufferRef.current = dayPrefix;
      publishFiltered(dayPrefix);
    };

    const scheduleAmbiguousCommit = (
      eventId: string,
      dayKey: string,
      buffer: string,
    ) => {
      clearAmbiguousCommitTimer();
      ambiguousCommitTimerRef.current = setTimeout(() => {
        ambiguousCommitTimerRef.current = null;
        if (!isActiveRef.current) return;
        if (bufferRef.current !== buffer) return;
        commitFocus(eventId, dayKey, buffer);
      }, DIGIT_AMBIGUOUS_COMMIT_MS);
    };

    const applyMatch = (match: NonNullable<DayJumpMatchResult>) => {
      if (match.kind === "prefix") {
        bufferRef.current = match.buffer;
        eventJumpActions.setActiveDayKeys(
          match.dayKeys,
          match.buffer === "s" ? "Sunday or Saturday" : undefined,
        );
        publishFiltered(match.buffer);
        if (match.pendingExactEventId) {
          const exact = assignmentsRef.current.find(
            (assignment) => assignment.eventId === match.pendingExactEventId,
          );
          if (exact) {
            // The advertised token plus Enter should not wait 400ms just
            // because a longer sibling exists (W2 vs W20).
            if (
              exact.eventId === useEventJumpStore.getState().pointerHintEventId
            ) {
              commitFocus(exact.eventId, exact.dayKey, match.buffer);
            } else {
              scheduleAmbiguousCommit(
                exact.eventId,
                exact.dayKey,
                match.buffer,
              );
            }
          }
        } else {
          clearAmbiguousCommitTimer();
        }
        return;
      }

      if (match.kind === "selectDay") {
        clearAmbiguousCommitTimer();
        bufferRef.current = match.buffer;
        shortcutHintProgressActions.demonstrate("week-day-focus");
        const dayName = dayNameForPrefix(match.dayPrefix);
        eventJumpActions.setActiveDayKeys(
          [match.dayKey],
          `${dayName} selected`,
        );
        // Keep chips for the selected day so a following digit can refine.
        publishFiltered(match.dayPrefix);
        const pointerHintEventId =
          useEventJumpStore.getState().pointerHintEventId;
        const keepClickedEvent =
          !!pointerHintEventId &&
          assignmentsRef.current.some(
            (item) =>
              item.eventId === pointerHintEventId &&
              item.dayKey === match.dayKey,
          );
        if (!keepClickedEvent) {
          focusEvent(match.firstEventId);
        }
        return;
      }

      commitFocus(match.eventId, match.dayKey, match.buffer);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (!isActiveRef.current) {
        if (isAppLocked() || isEditableKeyboardTarget(event)) return;
        if (isEditSequenceArmed()) return;

        if (quickTimeRef.current?.tryConsumeKey(event)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (isBareLetterKey(event, KEYMAP.eventJump.bareLetter)) {
          event.preventDefault();
          event.stopPropagation();
          activate();
          if (isActiveRef.current) {
            keyupSwallow.add(KEYMAP.eventJump.bareLetter);
          }
          return;
        }

        // Shift+day enters jump mode straight onto that column. Any other
        // shifted letter (Shift+J, Shift+C) falls through to its own handler.
        const key = normalizedKeyboardKey(event);
        if (!isShiftedSingleChar(event)) return;

        const assignments = rebuildAssignments();
        if (assignments.length === 0) return;

        const match = matchDayJumpKeystroke({
          assignments,
          key,
          buffer: "",
        });
        if (!match) return;

        event.preventDefault();
        event.stopPropagation();
        activate();
        if (!isActiveRef.current) return;
        keyupSwallow.add(key);
        applyMatch(match);
        return;
      }

      if (isAppLocked() || isEditableKeyboardTarget(event)) {
        deactivate();
        return;
      }

      // Only on an empty buffer: once a day letter is typed ("w"), the digits
      // that follow are that day's event index. Esc or a second `h` clears the
      // buffer and puts quick-time back within reach.
      if (
        bufferRef.current === "" &&
        quickTimeRef.current?.tryConsumeKey(event)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === "Escape") {
        if (isHigherEscapeOwner()) return;
        event.preventDefault();
        event.stopPropagation();
        deactivate();
        return;
      }

      // Arrows keep mode on so letter-then-arrows can move focus.
      if (keyboardKey(event).startsWith("Arrow")) {
        clearAmbiguousCommitTimer();
        stripDigitBuffer();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = normalizedKeyboardKey(event);
      if (key.length !== 1) return;

      // Swallow j/k and other unmatched printable shortcuts while jump is on.
      const match = matchDayJumpKeystroke({
        assignments: assignmentsRef.current,
        key,
        buffer: bufferRef.current,
      });

      if (!match) {
        clearAmbiguousCommitTimer();
        stripDigitBuffer();
        event.preventDefault();
        event.stopPropagation();
        keyupSwallow.add(key);
        if (key === KEYMAP.eventJump.bareLetter) {
          deactivate();
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      keyupSwallow.add(key);
      applyMatch(match);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keyupSwallow.consume(event);
    };

    const onBlur = () => {
      if (isActiveRef.current) deactivate();
    };

    const onPointerEventJumpRequest = (event: Event) => {
      if (isAppLocked()) return;
      const eventId = pointerEventJumpId(event);
      if (!eventId) return;
      const assignments = rebuildAssignments();
      const assignment = assignments.find((item) => item.eventId === eventId);
      if (!assignment) return;

      isActiveRef.current = true;
      bufferRef.current = "";
      eventJumpActions.setActive(true);
      eventJumpActions.setActiveDayKeys([assignment.dayKey]);
      eventJumpActions.setPointerHint({
        eventId: assignment.eventId,
        key: assignment.hint.toUpperCase(),
      });
      setHints(toActiveHints(assignments, visibleByIdRef.current));
      // Focus now so the advertised Enter path works, including when this
      // token is a prefix of a longer sibling (W2 vs W20) that would otherwise
      // wait 400ms before focusing.
      focusEvent(eventId);
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    document.addEventListener(
      POINTER_EVENT_JUMP_REQUEST,
      onPointerEventJumpRequest,
    );

    return () => {
      clearAmbiguousCommitTimer();
      keyupSwallow.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener(
        POINTER_EVENT_JUMP_REQUEST,
        onPointerEventJumpRequest,
      );
      if (isActiveRef.current) {
        eventJumpActions.reset();
      }
    };
  }, []);

  // Rebuild chips when the event set changes while mode is on. Uses refs for
  // listVisible so an inline callback identity does not loop setState.
  const eventIdsKey = [...allDayEvents, ...timedEvents]
    .map((event) => event._id ?? "")
    .join(",");

  useEffect(() => {
    if (!isActive) {
      // External resets clear the store without going through deactivate();
      // drop local chips/buffer to match.
      bufferRef.current = "";
      assignmentsRef.current = [];
      visibleByIdRef.current = new Map();
      setHints([]);
      return;
    }
    void eventIdsKey;

    const { assignments, visibleById } = buildDayJumpAssignments(
      listVisibleRef.current(),
      [...allDayEventsRef.current, ...timedEventsRef.current],
    );
    assignmentsRef.current = assignments;
    visibleByIdRef.current = visibleById;
    const pointerHintEventId = useEventJumpStore.getState().pointerHintEventId;
    if (pointerHintEventId) {
      const assignment = assignments.find(
        (item) => item.eventId === pointerHintEventId,
      );
      if (!assignment) {
        eventJumpActions.setPointerHint(null);
      } else {
        const nextKey = assignment.hint.toUpperCase();
        if (nextKey !== useEventJumpStore.getState().pointerHintKey) {
          eventJumpActions.setPointerHint({
            eventId: assignment.eventId,
            key: nextKey,
          });
        }
      }
    }
    const source = bufferRef.current
      ? filterHintsByPrefix(assignments, bufferRef.current)
      : assignments;
    setHints(toActiveHints(source, visibleById));
  }, [eventIdsKey, isActive]);

  // Publish the day columns that have a live jump key, so the sidebar tip only
  // teaches a keystroke that would actually land somewhere. Derived from the
  // event props rather than the DOM registry so it is current before any
  // keypress. Events without a start date would otherwise advertise the
  // FALLBACK_SCHEDULE's phantom Sunday.
  useEffect(() => {
    void eventIdsKey;
    const weekdays = [...allDayEventsRef.current, ...timedEventsRef.current]
      .filter((event) => Boolean(event.startDate))
      .map((event) => scheduleMeta(event).weekday);
    const next = dayJumpPrefixesForWeekdays(weekdays);
    publishedPrefixesRef.current = next;
    eventJumpActions.setJumpableDayPrefixes(next);
  }, [eventIdsKey]);

  // Only clear what this grid published: switching Day -> Week can mount the
  // new grid before the old one unmounts, and a blind clear there would blank
  // the incoming view's columns for the rest of the session.
  useEffect(
    () => () => {
      const published = publishedPrefixesRef.current;
      const current = useEventJumpStore.getState().jumpableDayPrefixes;
      const isOurs =
        current.length === published.length &&
        current.every((prefix, i) => prefix === published[i]);
      if (isOurs) eventJumpActions.setJumpableDayPrefixes([]);
    },
    [],
  );

  return { hints };
}
