import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { CalendarApi } from "@web/calendars/calendar.api";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { removeEventsByCalendarFromQueries } from "@web/events/queries/event.query.cache";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";

const DEFAULT_COALESCE_DELAY_MS = 400;

export const CALENDAR_VISIBILITY_FAILURE_MESSAGE =
  "Couldn't update calendar visibility. The change was undone.";

/**
 * Optimistic + coalesced calendar visibility toggle (packet 08 step 3).
 * Every call flips the calendars cache immediately, and on hide drops that
 * calendar's events from every cached event query so the grid lists
 * react without waiting on the network. Rapid toggles across calendars
 * accumulate in a ref and flush as a single `setVisibility` call after
 * `coalesceDelayMs` of quiet, so dragging through a calendar list doesn't
 * fire one request per row.
 */
export function useCalendarVisibility(
  coalesceDelayMs = DEFAULT_COALESCE_DELAY_MS,
) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<CalendarId, boolean>>(new Map());
  const snapshotRef = useRef<Calendar[] | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [failureAnnouncement, setFailureAnnouncement] = useState("");

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    const snapshot = snapshotRef.current;
    pendingRef.current = new Map();
    snapshotRef.current = undefined;
    if (pending.size === 0) return;

    const input = [...pending.entries()].map(([calendarId, isVisible]) => ({
      calendarId,
      isVisible,
    }));

    try {
      await CalendarApi.setVisibility(input);
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
    } catch {
      if (snapshot) {
        queryClient.setQueryData(calendarQueryKeys.all, snapshot);
      }
      void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      showErrorToast(CALENDAR_VISIBILITY_FAILURE_MESSAGE);
      setFailureAnnouncement(CALENDAR_VISIBILITY_FAILURE_MESSAGE);
    }
  }, [queryClient]);

  const toggleCalendarVisibility = useCallback(
    (calendarId: CalendarId, isVisible: boolean) => {
      if (pendingRef.current.size === 0) {
        snapshotRef.current = queryClient.getQueryData<Calendar[]>(
          calendarQueryKeys.all,
        );
      }
      pendingRef.current.set(calendarId, isVisible);

      queryClient.setQueryData<Calendar[]>(calendarQueryKeys.all, (current) =>
        current?.map((calendar) =>
          calendar.id === calendarId ? { ...calendar, isVisible } : calendar,
        ),
      );

      if (!isVisible) {
        removeEventsByCalendarFromQueries(queryClient, new Set([calendarId]));
      }

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), coalesceDelayMs);
    },
    [coalesceDelayMs, flush, queryClient],
  );

  return { toggleCalendarVisibility, failureAnnouncement };
}
