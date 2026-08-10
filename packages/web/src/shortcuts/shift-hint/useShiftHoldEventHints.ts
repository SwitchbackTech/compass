import { useEffect, useRef, useState } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import {
  selectKeyboardOnlyActive,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import {
  assignDayJumpKeys,
  type DayJumpAssignment,
  type DayJumpLabelMode,
  DIGIT_AMBIGUOUS_COMMIT_MS,
  filterHintsByPrefix,
  matchDayJumpKeystroke,
} from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import {
  eventJumpActions,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import {
  createShiftJumpGestureState,
  isShiftKey,
  reduceShiftJumpGesture,
  SHIFT_DOUBLE_TAP_MAX_GAP_MS,
  type ShiftJumpGestureState,
} from "@web/shortcuts/shift-hint/shift-hold-detector";

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

const isAppLocked = () => document.body.dataset.appLocked === "true";

const DAY_NAME_BY_PREFIX: Record<string, string> = {
  su: "Sunday",
  m: "Monday",
  t: "Tuesday",
  w: "Wednesday",
  r: "Thursday",
  f: "Friday",
  sa: "Saturday",
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
  mode: DayJumpLabelMode,
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
    assignments: assignDayJumpKeys(targets, mode),
    visibleById: new Map(visible.map((target) => [target.eventId, target])),
  };
};

/**
 * Tap Shift to toggle day-prefix jump labels on grid events. Esc or another
 * Shift tap exits. Day letters (and digits after a day) win over global
 * shortcuts while active. Shift+chords never toggle; Shift-Shift forces off
 * so keyboard-only mode can enter.
 */
export function useShiftHoldEventHints({
  allDayEvents = [],
  focus,
  listVisible,
  mode = "week",
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  focus: (target: ShiftHintFocusTarget) => void;
  listVisible: () => ShiftHintFocusTarget[];
  mode?: DayJumpLabelMode;
  timedEvents: GridEvent[];
}): EventJumpHintsResult {
  const [hints, setHints] = useState<ActiveShiftHint[]>([]);
  const isActive = useEventJumpStore((state) => state.isActive);

  const gestureRef = useRef<ShiftJumpGestureState>(
    createShiftJumpGestureState(),
  );
  const isActiveRef = useRef(false);
  const bufferRef = useRef("");
  const assignmentsRef = useRef<DayJumpAssignment[]>([]);
  const visibleByIdRef = useRef<Map<string, ShiftHintFocusTarget>>(new Map());
  const suppressKeyUpRef = useRef(new Set<string>());
  const ambiguousCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingActivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const focusRef = useRef(focus);
  const listVisibleRef = useRef(listVisible);
  const allDayEventsRef = useRef(allDayEvents);
  const timedEventsRef = useRef(timedEvents);
  const modeRef = useRef(mode);

  focusRef.current = focus;
  listVisibleRef.current = listVisible;
  allDayEventsRef.current = allDayEvents;
  timedEventsRef.current = timedEvents;
  modeRef.current = mode;
  isActiveRef.current = isActive;

  useEffect(() => {
    const clearAmbiguousCommitTimer = () => {
      if (ambiguousCommitTimerRef.current !== null) {
        clearTimeout(ambiguousCommitTimerRef.current);
        ambiguousCommitTimerRef.current = null;
      }
    };

    const clearPendingActivateTimer = () => {
      if (pendingActivateTimerRef.current !== null) {
        clearTimeout(pendingActivateTimerRef.current);
        pendingActivateTimerRef.current = null;
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
        modeRef.current,
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

    const activate = () => {
      if (selectKeyboardOnlyActive(useKeyboardOnlyStore.getState())) return;
      const assignments = rebuildAssignments();
      if (assignments.length === 0) return;
      isActiveRef.current = true;
      bufferRef.current = "";
      eventJumpActions.setActive(true);
      eventJumpActions.setActiveDayKeys([]);
      setHints(toActiveHints(assignments, visibleByIdRef.current));
    };

    const scheduleActivate = () => {
      clearPendingActivateTimer();
      // Defer past the Shift-Shift window so keyboard-only can win without a
      // jump-mode flash on the first tap.
      // Wait just past the double-tap window so a second Shift is forceOff
      // (keyboard-only) rather than racing this activate.
      pendingActivateTimerRef.current = setTimeout(() => {
        pendingActivateTimerRef.current = null;
        if (isActiveRef.current) return;
        if (isAppLocked()) return;
        activate();
      }, SHIFT_DOUBLE_TAP_MAX_GAP_MS + 1);
    };

    const deactivate = (announceOff = true) => {
      clearPendingActivateTimer();
      isActiveRef.current = false;
      bufferRef.current = "";
      clearHints();
      if (announceOff) {
        eventJumpActions.setActive(false);
      } else {
        eventJumpActions.silenceOff();
      }
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
      // Day view clears the buffer; week keeps the day prefix for the next index.
      if (modeRef.current === "day") {
        bufferRef.current = "";
        publishFiltered("");
        return;
      }
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (isShiftKey(event)) {
        if (event.repeat) return;
        const blocked = isAppLocked() || isEditableKeyboardTarget(event);
        const result = reduceShiftJumpGesture(gestureRef.current, {
          type: "shiftDown",
          now: Date.now(),
          blocked,
        });
        gestureRef.current = result.state;
        return;
      }

      if (gestureRef.current.phase === "armed") {
        // Chord while Shift is down (Shift+J, Shift+Arrow, …): never toggle.
        const result = reduceShiftJumpGesture(gestureRef.current, {
          type: "chordKeyDown",
        });
        gestureRef.current = result.state;
        return;
      }

      if (!isActiveRef.current) return;
      if (isAppLocked() || isEditableKeyboardTarget(event)) {
        deactivate();
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
      if (event.key.startsWith("Arrow")) {
        clearAmbiguousCommitTimer();
        stripDigitBuffer();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key.length !== 1) return;

      // Swallow j/k and other unmatched printable shortcuts while jump is on.
      const match = matchDayJumpKeystroke({
        assignments: assignmentsRef.current,
        key,
        buffer: bufferRef.current,
        mode: modeRef.current,
      });

      event.preventDefault();
      event.stopPropagation();
      suppressKeyUpRef.current.add(key);

      if (!match) {
        clearAmbiguousCommitTimer();
        stripDigitBuffer();
        return;
      }

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
            scheduleAmbiguousCommit(exact.eventId, exact.dayKey, match.buffer);
          }
        } else {
          clearAmbiguousCommitTimer();
        }
        return;
      }

      if (match.kind === "selectDay") {
        clearAmbiguousCommitTimer();
        bufferRef.current = match.buffer;
        const dayName = DAY_NAME_BY_PREFIX[match.dayPrefix] ?? match.dayPrefix;
        eventJumpActions.setActiveDayKeys(
          [match.dayKey],
          `${dayName} selected`,
        );
        // Keep chips for the selected day so a following digit can refine.
        publishFiltered(match.dayPrefix);
        focusEvent(match.firstEventId);
        return;
      }

      commitFocus(match.eventId, match.dayKey, match.buffer);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isShiftKey(event)) {
        if (event.shiftKey) return;

        const { state, toggle, forceOff } = reduceShiftJumpGesture(
          gestureRef.current,
          {
            type: "shiftUp",
            now: Date.now(),
          },
        );
        gestureRef.current = state;

        if (forceOff) {
          // Cancel a deferred first-tap activate; silence if jump already on.
          clearPendingActivateTimer();
          if (isActiveRef.current) deactivate(false);
          return;
        }

        if (!toggle) return;
        if (isAppLocked() || isEditableKeyboardTarget(event)) return;

        if (isActiveRef.current) {
          deactivate();
        } else if (pendingActivateTimerRef.current !== null) {
          // Second intentional tap after deferral window started but before
          // activate fired: treat as cancel (also covers slow double intent).
          clearPendingActivateTimer();
        } else {
          scheduleActivate();
        }
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!suppressKeyUpRef.current.has(key)) return;
      suppressKeyUpRef.current.delete(key);
      event.preventDefault();
      event.stopPropagation();
    };

    const onBlur = () => {
      gestureRef.current = createShiftJumpGestureState();
      clearPendingActivateTimer();
      if (isActiveRef.current) deactivate();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      clearAmbiguousCommitTimer();
      clearPendingActivateTimer();
      suppressKeyUpRef.current.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
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
    if (!isActive) return;
    // Read eventIdsKey so the effect re-runs when the visible event id set changes.
    void eventIdsKey;

    const { assignments, visibleById } = buildDayJumpAssignments(
      listVisibleRef.current(),
      [...allDayEventsRef.current, ...timedEventsRef.current],
      modeRef.current,
    );
    assignmentsRef.current = assignments;
    visibleByIdRef.current = visibleById;
    const source = bufferRef.current
      ? filterHintsByPrefix(assignments, bufferRef.current)
      : assignments;
    setHints(toActiveHints(source, visibleById));
  }, [eventIdsKey, isActive]);

  return { hints };
}
