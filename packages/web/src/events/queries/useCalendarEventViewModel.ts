import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { type NormalizedEventQueryData } from "./event.query.types";
import { deriveCalendarEventViewModel } from "./event.view-model";
import { filterEventsByVisibleCalendars } from "./filter-events-by-visible-calendars";
import { mergeCrossAccountDuplicates } from "./merge-cross-account-duplicates";

/**
 * The shared query-data -> grid pipeline behind the Day and Week view models:
 * drop hidden calendars, merge cross-account duplicate meetings, then derive
 * the grid arrays. Order matters - the merge runs AFTER the visibility filter
 * so hiding one account's calendar unmerges on its own, and BEFORE the view
 * model so the grid and the Up Next banner both see one event per meeting.
 *
 * No useMemo here: all three stages are module-level caches keyed on their
 * input references, so every consumer of the same query data already gets
 * the same output references back.
 */
export function useCalendarEventViewModel(
  data: NormalizedEventQueryData | undefined,
) {
  const { data: calendars } = useCalendarsQuery();
  const defaultAccountEmail = useDefaultTargetCalendar(
    calendars ?? [],
  )?.accountEmail;

  return deriveCalendarEventViewModel(
    mergeCrossAccountDuplicates(
      filterEventsByVisibleCalendars(data, calendars),
      calendars,
      defaultAccountEmail,
    ),
  );
}
