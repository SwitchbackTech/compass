import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { Timer } from "@core/util/timer";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";

const _id = "FOCUS_TIMER";
const startDate = new Date();
const endDate = dayjs().add(1, "year").toDate();
const timer = new Timer({ _id, startDate, endDate, interval: 1000 });

export function useRealtimeFocusData(): {
  now: Date;
  nextEvent?: Schema_WebEvent;
  nextEventStarts?: string;
} {
  const [now, setNow] = useState(timer.startDate);
  useDayEvents(dayjs());
  const dayEvents = useAppSelector(selectDayEvents);
  const [nextEvent, setNextEvent] = useState<Schema_WebEvent | undefined>();

  // Transform Redux events to the format expected by the rest of the hook
  const events = useMemo(() => {
    return dayEvents.map((event) => ({
      id: event._id ?? "",
      title: event.title ?? "",
      startTime: new Date(event.startDate as string),
      endTime: new Date(event.endDate as string),
      isAllDay: event.isAllDay ?? false,
    }));
  }, [dayEvents]);

  const updateNow = useCallback(() => setNow(new Date()), []);

  const getNextEvent = useCallback(() => {
    const event = events.find(({ endTime }) => dayjs(now).isBefore(endTime));

    if (!event) return;

    return {
      ...event,
      _id: event?.id,
      startDate: event?.startTime.toISOString(),
      endDate: event?.endTime.toISOString(),
    } as unknown as Schema_WebEvent;
  }, [events, now]);

  const updateNextEvent = useCallback(
    () => setNextEvent(getNextEvent()),
    [getNextEvent],
  );

  const nextEventStarts = useMemo(() => {
    if (!nextEvent?.startDate) return;

    const start = parseCompassEventDate(nextEvent?.startDate);

    if (start.isBefore(now)) return;

    return start.from(now);
  }, [nextEvent?.startDate, now]);

  useEffect(() => {
    timer.on("tick", updateNow);
    timer.on("tick", updateNextEvent);

    return () => {
      timer.off("tick", updateNow);
      timer.off("tick", updateNextEvent);
    };
  }, [updateNow, updateNextEvent]);

  return { now, nextEvent, nextEventStarts };
}
