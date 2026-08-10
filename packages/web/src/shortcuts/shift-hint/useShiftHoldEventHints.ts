import { useEffect, useRef, useState } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
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
import { subscribeToShiftTapGesture } from "@web/shortcuts/shift-tap-gesture";

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
 * Press Shift to show day-prefix jump labels immediately; release confirms.
 * Esc or another Shift tap exits. Day letters (and digits after a day) win
 * over global shortcuts while active. Shift+chords and long holds cancel the
 * optimistic press; Shift-Shift forces off so keyboard-only mode can enter.
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

  const isActiveRef = useRef(false);
  const bufferRef = useRef("");
  const assignmentsRef = useRef<DayJumpAssignment[]>([]);
  const visibleByIdRef = useRef<Map<string, ShiftHintFocusTarget>>(new Map());
  const suppressKeyUpRef = useRef(new Set<string>());
  /** True when the current Shift press opened jump mode before keyup. */
  const openedByPressRef = useRef(false);
  const ambiguousCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
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
      if (isAppLocked()) return;
      if (selectKeyboardOnlyActive(useKeyboardOnlyStore.getState())) return;
      const assignments = rebuildAssignments();
      if (assignments.length === 0) return;
      isActiveRef.current = true;
      bufferRef.current = "";
      eventJumpActions.setActive(true);
      eventJumpActions.setActiveDayKeys([]);
      setHints(toActiveHints(assignments, visibleByIdRef.current));
    };

    const deactivate = (announceOff = true) => {
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
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!suppressKeyUpRef.current.has(key)) return;
      suppressKeyUpRef.current.delete(key);
      event.preventDefault();
      event.stopPropagation();
    };

    const onBlur = () => {
      if (isActiveRef.current) deactivate();
    };

    // Press shows hints before release; quick release confirms (or toggles
    // off when mode was already on). Chord / hold-timeout cancel an
    // optimistic press. Double tap cancels and hands off to keyboard-only.
    const unsubscribeShiftGesture = subscribeToShiftTapGesture((event) => {
      if (event.type === "press") {
        if (isActiveRef.current) {
          openedByPressRef.current = false;
          return;
        }
        activate();
        openedByPressRef.current = isActiveRef.current;
        return;
      }
      if (event.type === "cancel") {
        if (openedByPressRef.current) {
          openedByPressRef.current = false;
          deactivate(false);
        }
        return;
      }
      if (event.type === "singleTap") {
        if (openedByPressRef.current) {
          openedByPressRef.current = false;
          return;
        }
        if (isActiveRef.current) {
          deactivate();
        } else {
          activate();
        }
        return;
      }
      openedByPressRef.current = false;
      if (isActiveRef.current) deactivate(false);
    });

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      clearAmbiguousCommitTimer();
      suppressKeyUpRef.current.clear();
      openedByPressRef.current = false;
      unsubscribeShiftGesture();
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
