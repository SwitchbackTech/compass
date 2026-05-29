import dayjs from "@core/util/date/dayjs";
import {
  type CalendarTimedDeckLayout,
  createCalendarTimedEventLayout,
} from "@web/common/calendar-grid/layout/calendarTimedDeckLayout";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export const getActiveTimedDraftDeckLayout = (
  draft: Schema_GridEvent | null,
  timedEvents: Schema_GridEvent[],
): CalendarTimedDeckLayout | null => {
  if (!draft?._id || draft.isAllDay) {
    return null;
  }

  const draftIndex = timedEvents.findIndex((event) => event._id === draft._id);
  if (draftIndex === -1) {
    return null;
  }

  const eventsWithDraft = [...timedEvents];
  eventsWithDraft[draftIndex] = draft;
  const draftDayEvents = eventsWithDraft.filter((event) =>
    dayjs(event.startDate).isSame(draft.startDate, "day"),
  );

  return (
    createCalendarTimedEventLayout(draftDayEvents).find(
      ({ event }) => event._id === draft._id,
    )?.deckLayout ?? null
  );
};
