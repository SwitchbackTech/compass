import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";

export type GridEventShortcutTarget = {
  eventId: string;
  eventType: "all-day" | "timed";
};

export type FocusableGridEventTarget = GridEventShortcutTarget & {
  element: HTMLElement;
};

/**
 * Order visible grid targets chronologically: earlier start first; on a tie,
 * all-day before timed. Stops at ends (no wrap).
 */
export function getChronologicallyAdjacentTarget({
  allDayEvents,
  direction,
  focused,
  timedEvents,
  visible,
}: {
  allDayEvents: GridEvent[];
  direction: "previous" | "next";
  focused: GridEventShortcutTarget | null;
  timedEvents: GridEvent[];
  visible: FocusableGridEventTarget[];
}): FocusableGridEventTarget | null {
  if (visible.length === 0 || !focused) return null;

  const startMsById = new Map<string, number>();
  for (const event of [...allDayEvents, ...timedEvents]) {
    if (event._id && event.startDate) {
      startMsById.set(event._id, dayjs(event.startDate).valueOf());
    }
  }

  const sorted = [...visible].sort((a, b) => {
    const aStart = startMsById.get(a.eventId) ?? 0;
    const bStart = startMsById.get(b.eventId) ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    if (a.eventType !== b.eventType) {
      return a.eventType === "all-day" ? -1 : 1;
    }
    return a.eventId.localeCompare(b.eventId);
  });

  const index = sorted.findIndex(
    (target) =>
      target.eventId === focused.eventId &&
      target.eventType === focused.eventType,
  );
  if (index < 0) return null;

  const nextIndex = direction === "previous" ? index - 1 : index + 1;
  return sorted[nextIndex] ?? null;
}
