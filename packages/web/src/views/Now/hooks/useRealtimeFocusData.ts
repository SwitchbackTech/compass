import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { Timer } from "@core/util/timer";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { selectTimedDayEvents } from "@web/ducks/events/selectors/event.selectors";
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
  const timedDayEvents = useAppSelector(selectTimedDayEvents);
  const [nextEvent, setNextEvent] = useState<Schema_WebEvent | undefined>();

  const updateNow = useCallback(() => setNow(new Date()), []);

  const getNextEvent = useCallback((): Schema_WebEvent | undefined => {
    const event = timedDayEvents.find(
      ({ endDate }) => endDate && dayjs(now).isBefore(endDate),
    );

    if (!event?._id || !event?.startDate || !event?.endDate) {
      return undefined;
    }

    return event as Schema_WebEvent;
  }, [timedDayEvents, now]);

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
