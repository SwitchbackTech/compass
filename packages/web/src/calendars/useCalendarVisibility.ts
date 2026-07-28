import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { setCalendarHidden } from "@web/calendars/calendar-visibility.storage";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";

export const CALENDAR_VISIBILITY_FAILURE_MESSAGE =
  "Couldn't update calendar visibility. The change was undone.";

/**
 * Client-owned calendar visibility toggle (S39 A2).
 * Flips the calendars cache immediately and persists the hidden set in
 * localStorage (default visible). Event queries keep their data; the week/day
 * view models filter by isVisible so hide and show both update the grid
 * without a round trip. No server write — sync list always reports
 * isVisible:true, and the event read already returns every calendar (client
 * filter is the source of truth).
 */
export function useCalendarVisibility() {
  const queryClient = useQueryClient();
  const [failureAnnouncement, setFailureAnnouncement] = useState("");

  const toggleCalendarVisibility = (
    calendarId: CalendarId,
    isVisible: boolean,
  ) => {
    const saved = setCalendarHidden(calendarId, !isVisible);
    if (!saved) {
      showErrorToast(CALENDAR_VISIBILITY_FAILURE_MESSAGE);
      setFailureAnnouncement(CALENDAR_VISIBILITY_FAILURE_MESSAGE);
      return;
    }

    queryClient.setQueryData<Calendar[]>(calendarQueryKeys.all, (current) =>
      current?.map((calendar) =>
        calendar.id === calendarId ? { ...calendar, isVisible } : calendar,
      ),
    );
  };

  return { toggleCalendarVisibility, failureAnnouncement };
}
