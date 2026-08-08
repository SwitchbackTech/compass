import { useEffect, useRef, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import {
  assignShiftHintKeys,
  filterHintsByPrefix,
  matchShiftHintKeystroke,
  type ShiftHintAssignment,
} from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import {
  createShiftHoldState,
  reduceShiftHold,
  SHIFT_HOLD_HINT_THRESHOLD_MS,
  type ShiftHoldState,
} from "@web/shortcuts/shift-hint/shift-hold-detector";

export type ShiftHintFocusTarget = {
  eventId: string;
  eventType: "all-day" | "timed";
  element: HTMLElement;
};

export type ActiveShiftHint = ShiftHintAssignment & {
  element: HTMLElement;
};

const isAppLocked = () => document.body.dataset.appLocked === "true";

const isShiftKey = (event: KeyboardEvent) =>
  event.key === "Shift" ||
  event.code === "ShiftLeft" ||
  event.code === "ShiftRight";

const scheduleStartMs = (event: GridEvent): number => {
  if (!event.startDate) return 0;
  return dayjs(event.startDate).valueOf();
};

/** True when any part of the element intersects the viewport. */
const isInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

/**
 * Hold SHIFT (≥ threshold) to flash home-row hint chips on visible grid events.
 * Assigned key focuses the event and dismisses. Release clears. Quick chords
 * (Shift+J, Shift+Arrow) cancel before hints appear.
 */
export function useShiftHoldEventHints({
  allDayEvents = [],
  enabled = true,
  focus,
  listVisible,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  enabled?: boolean;
  focus: (target: ShiftHintFocusTarget) => void;
  listVisible: () => ShiftHintFocusTarget[];
  timedEvents: GridEvent[];
}): ActiveShiftHint[] {
  const [hints, setHints] = useState<ActiveShiftHint[]>([]);
  const stateRef = useRef<ShiftHoldState>(createShiftHoldState());
  const assignmentsRef = useRef<ShiftHintAssignment[]>([]);
  const visibleByIdRef = useRef<Map<string, ShiftHintFocusTarget>>(new Map());
  const thresholdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressKeyUpRef = useRef(new Set<string>());
  const focusRef = useRef(focus);
  const listVisibleRef = useRef(listVisible);
  const allDayEventsRef = useRef(allDayEvents);
  const timedEventsRef = useRef(timedEvents);

  focusRef.current = focus;
  listVisibleRef.current = listVisible;
  allDayEventsRef.current = allDayEvents;
  timedEventsRef.current = timedEvents;

  useEffect(() => {
    if (!enabled) {
      stateRef.current = createShiftHoldState();
      assignmentsRef.current = [];
      setHints([]);
      return;
    }

    const clearThresholdTimer = () => {
      if (thresholdTimerRef.current !== null) {
        clearTimeout(thresholdTimerRef.current);
        thresholdTimerRef.current = null;
      }
    };

    const publishHints = (next: ActiveShiftHint[]) => {
      setHints(next);
    };

    const clearHints = () => {
      assignmentsRef.current = [];
      visibleByIdRef.current = new Map();
      publishHints([]);
    };

    const buildAssignments = () => {
      // Targeting adapters include laid-out-but-scrolled-off cards; flash
      // hints only for events intersecting the viewport.
      const visible = listVisibleRef
        .current()
        .filter((target) => isInViewport(target.element));
      const scheduleById = new Map<string, number>();
      for (const event of [
        ...allDayEventsRef.current,
        ...timedEventsRef.current,
      ]) {
        if (!event._id) continue;
        scheduleById.set(event._id, scheduleStartMs(event));
      }

      const targets = visible.map((target) => ({
        eventId: target.eventId,
        eventType: target.eventType,
        startMs: scheduleById.get(target.eventId) ?? 0,
      }));

      const assignments = assignShiftHintKeys(targets);
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

    const activate = () => {
      stateRef.current = reduceShiftHold(stateRef.current, {
        type: "thresholdReached",
      });
      if (stateRef.current.phase !== "active") return;
      publishHints(buildAssignments());
    };

    const dismiss = () => {
      clearThresholdTimer();
      stateRef.current = reduceShiftHold(stateRef.current, { type: "dismiss" });
      clearHints();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (isShiftKey(event)) {
        if (event.repeat) return;
        const blocked = isAppLocked() || isEditableKeyboardTarget(event);
        stateRef.current = reduceShiftHold(stateRef.current, {
          type: "shiftDown",
          now: Date.now(),
          blocked,
        });
        clearThresholdTimer();
        if (stateRef.current.phase !== "pending") return;

        thresholdTimerRef.current = setTimeout(() => {
          thresholdTimerRef.current = null;
          if (stateRef.current.phase !== "pending") return;
          if (isAppLocked()) {
            dismiss();
            return;
          }
          activate();
        }, SHIFT_HOLD_HINT_THRESHOLD_MS);
        return;
      }

      if (stateRef.current.phase === "pending") {
        // Any other key while pending is a chord (Shift+J, Shift+Arrow, …).
        clearThresholdTimer();
        stateRef.current = reduceShiftHold(stateRef.current, {
          type: "chordKeyDown",
        });
        return;
      }

      if (stateRef.current.phase !== "active") return;
      if (isAppLocked() || isEditableKeyboardTarget(event)) {
        dismiss();
        return;
      }

      // Escape / arrows dismiss and let existing handlers run.
      if (
        event.key === "Escape" ||
        event.key.startsWith("Arrow") ||
        event.key === "j" ||
        event.key === "J" ||
        event.key === "k" ||
        event.key === "K"
      ) {
        dismiss();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        dismiss();
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const match = matchShiftHintKeystroke({
        assignments: assignmentsRef.current,
        key,
        prefix: stateRef.current.hintPrefix,
      });

      if (!match) return;

      event.preventDefault();
      event.stopPropagation();
      suppressKeyUpRef.current.add(key);

      if (match.kind === "prefix") {
        stateRef.current = reduceShiftHold(stateRef.current, {
          type: "setPrefix",
          prefix: match.prefix,
        });
        const narrowed = filterHintsByPrefix(
          assignmentsRef.current,
          match.prefix,
        );
        publishHints(
          narrowed.flatMap((assignment) => {
            const target = visibleByIdRef.current.get(assignment.eventId);
            if (!target) return [];
            return [{ ...assignment, element: target.element }];
          }),
        );
        return;
      }

      const target = visibleByIdRef.current.get(match.eventId);
      dismiss();
      if (!target) return;
      target.element.scrollIntoView({ block: "nearest" });
      focusRef.current(target);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isShiftKey(event)) {
        // Keep holding if the other Shift key is still down.
        if (event.shiftKey) return;

        const wasActive = stateRef.current.phase === "active";
        clearThresholdTimer();
        stateRef.current = reduceShiftHold(stateRef.current, {
          type: "shiftUp",
          now: Date.now(),
        });
        if (wasActive || assignmentsRef.current.length > 0) {
          clearHints();
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
      dismiss();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      clearThresholdTimer();
      suppressKeyUpRef.current.clear();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]);

  return hints;
}
