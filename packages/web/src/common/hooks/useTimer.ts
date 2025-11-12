import { ListenerFn } from "eventemitter2";
import { useEffect, useRef } from "react";
import { Timer, TimerOptions } from "@core/util/timer";

export function useTimer({
  options,
  onTick,
  onStart,
  onEnd,
}: {
  options: TimerOptions;
  onStart?: ListenerFn;
  onEnd?: ListenerFn;
  onTick?: ListenerFn;
}): Timer {
  const { current: timer } = useRef(new Timer(options));

  useEffect(() => {
    if (onTick) timer.on("tick", onTick);
    if (onStart) timer.on("start", onStart);
    if (onEnd) timer.on("end", onEnd);
  }, [onTick, onStart, onEnd, timer]);

  return timer;
}
