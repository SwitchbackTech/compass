import { queryOptions, useQuery } from "@tanstack/react-query";
import { type Calendar } from "@core/types/calendar.contracts";
import { CalendarApi } from "@web/api/calendar.api";
import { useSession } from "@web/auth/compass/session/useSession";
import { applyClientVisibility } from "@web/calendars/apply-client-visibility";
import {
  getLocalCalendarSentinelId,
  synthesizeLocalCalendar,
} from "@web/calendars/local-calendar.sentinel";

export const calendarQueryKeys = {
  all: ["calendars"] as const,
};

// Anonymous/offline mode never calls the API - it synthesizes the one local
// calendar from the sentinel id so downstream code (drafts, transitions)
// always has a calendar list to read from (B12). Authenticated lists overlay
// client-owned visibility (localStorage) so sync's always-true isVisible and
// legacy Mongo prefs are not the source of truth (S39 A2).
export function calendarsQueryOptions(authenticated: boolean) {
  return queryOptions({
    queryKey: calendarQueryKeys.all,
    queryFn: async (): Promise<Calendar[]> => {
      if (!authenticated) {
        return applyClientVisibility([
          synthesizeLocalCalendar(getLocalCalendarSentinelId()),
        ]);
      }

      return applyClientVisibility(await CalendarApi.list());
    },
    staleTime: 60_000,
  });
}

export function useCalendarsQuery() {
  const { authenticated } = useSession();
  return useQuery(calendarsQueryOptions(authenticated));
}
