import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
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
  isActive: boolean;
  activeDayKeys: string[];
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

const scheduleMeta = (event: GridEvent) => {
  if (!event.startDate) {
    return { startMs: 0, dayKey: "1970-01-01", weekday: 0 };
  }
  const start = dayjs(event.startDate);
  return {
    startMs: start.valueOf(),
    dayKey: start.format("YYYY-MM-DD"),
    weekday: start.day(),
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
  enabled = true,
  focus,
  listVisible,
  mode = "week",
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  enabled?: boolean;
  focus: (target: ShiftHintFocusTarget) => void;
  listVisible: () => ShiftHintFocusTarget[];
  mode?: DayJumpLabelMode;
  timedEvents: GridEvent[];
}): EventJumpHintsResult {
  const [hints, setHints] = useState<ActiveShiftHint[]>([]);
  const isActive = useEventJumpStore((state) => state.isActive);
  const activeDayKeys = useEventJumpStore((state) => state.activeDayKeys);

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
    if (!enabled) {
      gestureRef.current = createShiftJumpGestureState();
      bufferRef.current = "";
      assignmentsRef.current = [];
      setHints([]);
      eventJumpActions.reset();
      return;
    }

    const clearAmbiguousCommitTimer = () => {
      if (ambiguousCommitTimerRef.current !== null) {
        clearTimeout(ambiguousCommitTimerRef.current);
        ambiguousCommitTimerRef.current = null;
      }
    };

    const publishHints = (next: ActiveShiftHint[]) => {
      setHints(next);
    };

    const clearHints = () => {
      clearAmbiguousCommitTimer();
      assignmentsRef.current = [];
      visibleByIdRef.current = new Map();
      bufferRef.current = "";
      publishHints([]);
    };

    const buildAssignments = () => {
      // Label every registered event in the view (not only viewport cards) so
      // day indices stay stable while scrolling.
      const visible = listVisibleRef.current();
      const scheduleById = new Map<
        string,
        { startMs: number; dayKey: string; weekday: number }
      >();
      for (const event of [
        ...allDayEventsRef.current,
        ...timedEventsRef.current,
      ]) {
        if (!event._id) continue;
        scheduleById.set(event._id, scheduleMeta(event));
      }

      const targets = visible.map((target) => {
        const meta = scheduleById.get(target.eventId) ?? {
          startMs: 0,
          dayKey: "1970-01-01",
          weekday: 0,
        };
        return {
          eventId: target.eventId,
          eventType: target.eventType,
          startMs: meta.startMs,
          dayKey: meta.dayKey,
          weekday: meta.weekday,
        };
      });

      const assignments = assignDayJumpKeys(targets, modeRef.current);
      assignmentsRef.current = assignments;
      visibleByIdRef.current = new Map(
        visible.map((target) => [target.eventId, target]),
      );

      return assignments.flatMap((assignment) => {
        const target = visibleByIdRef.current.get(assignment.eventId);
        if (!target) return [];
        return [{ ...assignment, element: target.element }];
      });
    };

    const publishFiltered = (buffer: string) => {
      const source = buffer
        ? filterHintsByPrefix(assignmentsRef.current, buffer)
        : assignmentsRef.current;
      publishHints(
        source.flatMap((assignment) => {
          const target = visibleByIdRef.current.get(assignment.eventId);
          if (!target) return [];
          return [{ ...assignment, element: target.element }];
        }),
      );
    };

    const activate = () => {
      isActiveRef.current = true;
      bufferRef.current = "";
      eventJumpActions.setActive(true);
      eventJumpActions.setActiveDayKeys([]);
      publishHints(buildAssignments());
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
      publishFiltered(buffer.replace(/\d+$/, "") || buffer);
      focusEvent(eventId);
      // Reset digit buffer to the day prefix so another index can be typed,
      // or clear fully in day mode.
      const dayPrefix = buffer.replace(/\d+$/, "");
      bufferRef.current = dayPrefix;
      if (modeRef.current === "day") {
        bufferRef.current = "";
        publishFiltered("");
      }
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
          if (isActiveRef.current) deactivate(false);
          return;
        }

        if (!toggle) return;
        if (isAppLocked() || isEditableKeyboardTarget(event)) return;

        if (isActiveRef.current) {
          deactivate();
        } else {
          activate();
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
      if (isActiveRef.current) deactivate();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      clearAmbiguousCommitTimer();
      suppressKeyUpRef.current.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      if (isActiveRef.current) {
        eventJumpActions.reset();
      }
    };
  }, [enabled]);

  const eventIdsKey = useMemo(
    () =>
      [...allDayEvents, ...timedEvents]
        .map((event) => event._id ?? "")
        .join(","),
    [allDayEvents, timedEvents],
  );

  // Rebuild chips when the event set changes while mode is on. Uses refs for
  // listVisible so an inline callback identity does not loop setState.
  useEffect(() => {
    if (!enabled || !isActive) return;
    // Read eventIdsKey so the effect re-runs when the visible event id set changes.
    void eventIdsKey;

    const visible = listVisibleRef.current();
    const scheduleById = new Map<
      string,
      { startMs: number; dayKey: string; weekday: number }
    >();
    for (const event of [
      ...allDayEventsRef.current,
      ...timedEventsRef.current,
    ]) {
      if (!event._id) continue;
      scheduleById.set(event._id, scheduleMeta(event));
    }
    const targets = visible.map((target) => {
      const meta = scheduleById.get(target.eventId) ?? {
        startMs: 0,
        dayKey: "1970-01-01",
        weekday: 0,
      };
      return {
        eventId: target.eventId,
        eventType: target.eventType,
        startMs: meta.startMs,
        dayKey: meta.dayKey,
        weekday: meta.weekday,
      };
    });
    const assignments = assignDayJumpKeys(targets, modeRef.current);
    assignmentsRef.current = assignments;
    visibleByIdRef.current = new Map(
      visible.map((target) => [target.eventId, target]),
    );
    const source = bufferRef.current
      ? filterHintsByPrefix(assignments, bufferRef.current)
      : assignments;
    setHints(
      source.flatMap((assignment) => {
        const target = visibleByIdRef.current.get(assignment.eventId);
        if (!target) return [];
        return [{ ...assignment, element: target.element }];
      }),
    );
  }, [enabled, eventIdsKey, isActive]);

  return { hints, isActive, activeDayKeys };
}
