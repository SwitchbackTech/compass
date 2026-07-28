import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { CalendarApi } from "@web/api/calendar.api";
import { useSession } from "@web/auth/compass/session/useSession";
import { applyClientVisibility } from "@web/calendars/apply-client-visibility";
import { useHiddenCalendarIds } from "@web/calendars/calendar-visibility.store";
import {
  getLocalCalendarSentinelId,
  synthesizeLocalCalendar,
} from "@web/calendars/local-calendar.sentinel";

export const calendarQueryKeys = {
  all: ["calendars"] as const,
};

// Anonymous/offline mode never calls the API - it synthesizes the one local
// calendar from the sentinel id so downstream code (drafts, transitions)
// always has a calendar list to read from (B12). The raw server list here
// never carries client visibility - useCalendarsQuery's `select` overlays it
// on every read, so any writer of this cache (SSE upsert, mutation, test
// seeding) gets correct isVisible for free instead of needing to re-run
// applyClientVisibility itself.
export function calendarsQueryOptions(authenticated: boolean) {
  return queryOptions({
    queryKey: calendarQueryKeys.all,
    queryFn: async (): Promise<Calendar[]> => {
      if (!authenticated) {
        return [synthesizeLocalCalendar(getLocalCalendarSentinelId())];
      }

      return CalendarApi.list();
    },
    staleTime: 60_000,
  });
}

export function useCalendarsQuery() {
  const { authenticated } = useSession();
  const hiddenIds = useHiddenCalendarIds();
  // A fresh arrow function every render would recompute select's full
  // map+spread over every calendar on every render, not just when hiddenIds
  // (or the underlying data) actually changes.
  const select = useCallback(
    (calendars: Calendar[]) => applyClientVisibility(calendars, hiddenIds),
    [hiddenIds],
  );

  return useQuery({ ...calendarsQueryOptions(authenticated), select });
}
