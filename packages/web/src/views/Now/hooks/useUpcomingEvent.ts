import { ObjectId } from "bson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { useTimer } from "@web/common/hooks/useTimer";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { useTodayEvents } from "@web/views/Day/hooks/events/useTodayEvents";

export function useUpcomingEvent(): {
  event?: Schema_WebEvent;
  starts?: string;
} {
  const { current: timerId } = useRef(`${new ObjectId()}-upcoming-event`);
  const { current: startDate } = useRef(new Date());
  const { current: endDate } = useRef(dayjs().add(1, "year").toDate());
  const [event, setEvent] = useState<Schema_WebEvent | undefined>();
  const events = useTodayEvents();

  const getUpcomingEvent = useCallback(() => {
    const event = events.find(({ endTime }) => dayjs().isBefore(endTime));

    if (!event) return;

    return {
      ...event,
      _id: event?.id,
      startDate: event?.startTime.toISOString(),
      endDate: event?.endTime.toISOString(),
    } as unknown as Schema_WebEvent;
  }, [events]);

  const updateUpcomingEvent = useCallback(
    () => setEvent(getUpcomingEvent()),
    [getUpcomingEvent],
  );

  const timer = useTimer({
    options: { _id: timerId, startDate, endDate },
    onTick: updateUpcomingEvent,
  });

  useEffect(() => {
    return () => timer.off("tick", updateUpcomingEvent);
  }, [updateUpcomingEvent, timer]);

  const starts = useMemo(() => {
    if (!event?.startDate) return;

    const now = dayjs();
    const start = parseCompassEventDate(event?.startDate);

    if (start.isBefore(now)) return;

    return start.from(now);
  }, [event?.startDate]);

  return useMemo(() => ({ event, starts }), [event, starts]);
}
