import { useCallback, useEffect, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useDayEventViewModel } from "@web/events/queries/useDayEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import { dayEventQueryRange } from "@web/views/Day/hooks/events/useDayEvents";

function useMinuteTick(): Dayjs {
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

export function useUpNextEvent() {
  const now = useMinuteTick();
  const { startDate, endDate } = dayEventQueryRange(now);
  const { events, timedEvents, allDayEvents } = useDayEventViewModel({
    startDate,
    endDate,
  });
  const multiDayTimed = allDayEvents
    .filter((event) => event.isTimedMultiDayDisplay)
    .flatMap((gridEvent) => {
      const source = events.find((event) => event.id === gridEvent._id);
      if (!source || source.schedule.kind !== "timed") return [];
      return [{ ...gridEvent, startDate: source.schedule.start }];
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
    .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());

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
