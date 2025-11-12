import { ListenerFn } from "eventemitter2";
import { useState } from "react";
import { Dayjs } from "@core/util/date/dayjs";
import { Schema_WebEvent } from "@web/common/types/web.event.types";

export function useFocusedTask({
  onEventStart = () => {},
  onEventEnd = () => {},
  onEventTick = () => {},
}: {
  onEventStart?: ListenerFn;
  onEventEnd?: ListenerFn;
  onEventTick?: ListenerFn;
} = {}) {
  const [task, focusTask] = useState<Schema_WebEvent | null>();
  const [countdown, setCountdown] = useState<Dayjs | undefined>();
  const [timeLeft, setTimeLeft] = useState<string | undefined>();

  return {
    task,
    focusTask,
  };
}
