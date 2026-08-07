import { useCallback } from "react";
import dayjs from "@core/util/date/dayjs";
import { useMinuteTick } from "@web/common/hooks/useMinuteTick";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useDayEventViewModel } from "@web/events/queries/useDayEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import { dayEventQueryRange } from "@web/views/Day/hooks/events/useDayEvents";

export function useUpNextEvent() {
  const now = useMinuteTick();
  const { startDate, endDate } = dayEventQueryRange(now);
  const { events, timedEvents, allDayEvents } = useDayEventViewModel({
    startDate,
    endDate,
  });
  // Restore the real timed bounds: the all-day-row projection rewrites both
  // dates to whole calendar days, and a date-only endDate would keep a
  // finished event looking like it is still running until midnight.
  const multiDayTimed = allDayEvents
    .filter((event) => event.isTimedMultiDayDisplay)
    .flatMap((gridEvent) => {
      const source = events.find((event) => event.id === gridEvent._id);
      if (!source || source.schedule.kind !== "timed") return [];
      return [
        {
          ...gridEvent,
          startDate: source.schedule.start,
          endDate: source.schedule.end,
        },
      ];
    });
  const allTimedEvents = [...timedEvents, ...multiDayTimed];

  const nowEvents = allTimedEvents
    .filter(
      (event) =>
        dayjs(event.startDate).isSameOrBefore(now) &&
        dayjs(event.endDate).isAfter(now),
    )
    .sort((a, b) => dayjs(a.endDate).valueOf() - dayjs(b.endDate).valueOf());

  const upcomingEvents = allTimedEvents
    .filter((event) => dayjs(event.startDate).isAfter(now))
    .sort(
      (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
    );

  const upNext = nowEvents[0] || upcomingEvents[0];
  const isCurrentEvent = !!nowEvents[0];

  const sourceEvent = upNext
    ? events.find((candidate) => candidate.id === upNext._id)
    : undefined;

  const openEventDetails = useCallback(
    (activity: "gridClick" | "keyboardEdit") => {
      if (!sourceEvent) return;

      const draft = editGridEventDraft(sourceEvent);
      if (!draft) return;

      draftActions.startGridDraft({ activity, draft });
      draftActions.setFormOpen(true);
    },
    [sourceEvent],
  );

  const conferenceUrl =
    sourceEvent?.content.kind === "details"
      ? sourceEvent.content.conference?.url
      : undefined;

  return { now, openEventDetails, upNext, conferenceUrl, isCurrentEvent };
}
