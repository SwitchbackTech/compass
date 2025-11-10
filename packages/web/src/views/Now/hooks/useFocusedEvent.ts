import { ListenerFn } from "eventemitter2";
import { useEffect, useMemo, useState } from "react";
import { zObjectId } from "@core/types/type.utils";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { Timer } from "@core/util/timer";
import { Schema_WebEvent } from "@web/common/types/web.event.types";

export function useFocusedEvent({
  onEventStart = () => {},
  onEventEnd = () => {},
  onEventTick = () => {},
}: {
  onEventStart?: ListenerFn;
  onEventEnd?: ListenerFn;
  onEventTick?: ListenerFn;
} = {}) {
  const [event, setEvent] = useState<Schema_WebEvent | null>();
  const [countdown, setCountdown] = useState<Dayjs | undefined>();
  const [timeLeft, setTimeLeft] = useState<string | undefined>();
  const _id = event?._id;
  const startDate = event?.startDate;
  const endDate = event?.endDate;

  const timer = useMemo(() => {
    if (!(_id && startDate && endDate)) return;

    const timer = new Timer({
      _id: zObjectId.parse(_id).toString(),
      startDate: parseCompassEventDate(startDate).toDate(),
      endDate: parseCompassEventDate(endDate).toDate(),
      interval: 1000,
    });

    timer.on("start", onEventStart);

    timer?.on("tick", () => {
      const now = dayjs();
      const diff = now.diff(timer.currentStartDate, "seconds");

      setCountdown(now.startOf("day").add(diff, "second"));
    });

    timer.on("tick", onEventTick);

    timer?.on("tick", () => setTimeLeft(dayjs(timer.endDate).fromNow(true)));

    timer?.on("end", () => setCountdown(undefined));
    timer?.on("end", () => setTimeLeft(undefined));

    timer.on("end", onEventEnd);

    return timer;
  }, [
    _id,
    startDate,
    endDate,
    setCountdown,
    setTimeLeft,
    onEventEnd,
    onEventStart,
    onEventTick,
  ]);

  useEffect(() => {
    return () => timer?.close();
  }, [timer]);

  return {
    focusedEvent: event,
    setFocusedEvent: setEvent,
    start: timer?.start.bind(timer),
    end: timer?.end.bind(timer),
    countdown: countdown?.format("HH:mm:ss"),
    timeLeft,
  };
}
