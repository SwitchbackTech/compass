import { RefObject, useCallback, useEffect } from "react";
import { TimeBlock } from "../types";

export interface CalendarEventKeyboardActions {
  setFocusedTaskId: (id: string | null) => void;
  setFocusedEventId: (id: string | null) => void;
  setFocusedEventPart: (part: "start" | "block" | "end" | null) => void;
}

export interface UseCalendarEventKeyboardOptions {
  timeBlocks: TimeBlock[];
  focusedEventId: string | null;
  focusedEventPart: "start" | "block" | "end" | null;
  calendarScrollRef: RefObject<HTMLDivElement>;
  actions: CalendarEventKeyboardActions;
}

export function useCalendarEventKeyboard({
  timeBlocks,
  focusedEventId,
  focusedEventPart,
  calendarScrollRef,
  actions,
}: UseCalendarEventKeyboardOptions) {
  const focusPart = useCallback(
    (id: string, which: "start" | "block" | "end") => {
      actions.setFocusedTaskId(null);
      actions.setFocusedEventId(id);
      actions.setFocusedEventPart(which);
      const sel = `[data-event-id="${id}"][data-event-part="${which}"]`;
      const target = calendarScrollRef.current?.querySelector<HTMLElement>(sel);
      if (target) {
        try {
          target.focus({ preventScroll: true } as any);
        } catch {
          try {
            target.focus();
          } catch {}
        }
        try {
          target.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth",
          });
        } catch {}
      }
    },
    [calendarScrollRef, actions],
  );

  useEffect(() => {
    const handleEventKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const activeEl = (document.activeElement as HTMLElement | null) ?? null;
      const activeEventId = activeEl?.getAttribute?.("data-event-id") || null;
      const eventIsFocused =
        !!focusedEventId && focusedEventId === activeEventId;

      if (!eventIsFocused) return;

      // When an event is focused, Tab cycles within its focus areas (start → block → end) then to next event's start (Shift+Tab reverses)
      if (e.key === "Tab" || key === "tab") {
        e.preventDefault();
        const sorted = [...timeBlocks].sort((a, b) =>
          a.startTime.localeCompare(b.startTime),
        );
        const currentIdx = sorted.findIndex((b) => b.id === activeEventId);
        const part = (activeEl?.getAttribute?.("data-event-part") ||
          "block") as "start" | "block" | "end";

        if (currentIdx !== -1 && sorted.length > 0) {
          if (e.shiftKey) {
            if (part === "end") {
              focusPart(activeEventId!, "block");
            } else if (part === "block") {
              focusPart(activeEventId!, "start");
            } else {
              const prevIdx = (currentIdx - 1 + sorted.length) % sorted.length;
              const prev = sorted[prevIdx];
              actions.setFocusedEventId(prev.id);
              focusPart(prev.id, "end");
            }
          } else {
            if (part === "start") {
              focusPart(activeEventId!, "block");
            } else if (part === "block") {
              focusPart(activeEventId!, "end");
            } else {
              const nextIdx = (currentIdx + 1) % sorted.length;
              const next = sorted[nextIdx];
              actions.setFocusedEventId(next.id);
              focusPart(next.id, "start");
            }
          }
        }
        return;
      }
    };

    document.addEventListener("keydown", handleEventKeyDown);
    return () => document.removeEventListener("keydown", handleEventKeyDown);
  }, [focusedEventId, focusedEventPart, timeBlocks, focusPart, actions]);
}
