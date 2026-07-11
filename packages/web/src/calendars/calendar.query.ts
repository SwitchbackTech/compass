import { queryOptions, useQuery } from "@tanstack/react-query";
import { type Calendar } from "@core/types/calendar.contracts";
import { useSession } from "@web/auth/compass/session/useSession";
import { CalendarApi } from "@web/calendars/calendar.api";
import {
  getLocalCalendarSentinelId,
  synthesizeLocalCalendar,
} from "@web/calendars/local-calendar.sentinel";

export const calendarQueryKeys = {
  all: ["calendars"] as const,
};

// Anonymous/offline mode never calls the API - it synthesizes the one local
// calendar from the sentinel id so downstream code (drafts, transitions)
// always has a calendar list to read from (B12).
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
  return useQuery(calendarsQueryOptions(authenticated));
}
