import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { Timer } from "@core/util/timer";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { useTodayEvents } from "@web/views/Day/hooks/events/useTodayEvents";

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
  const events = useTodayEvents();
  const [nextEvent, setNextEvent] = useState<Schema_WebEvent | undefined>();

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
