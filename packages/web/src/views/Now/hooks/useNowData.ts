import { useEffect } from "react";
import { useFocusedEvent } from "@web/views/Now/hooks/useFocusedEvent";
import { useRealtimeFocusData } from "@web/views/Now/hooks/useRealtimeFocusData";

export function useNowData() {
  const useFocused = useFocusedEvent();
  const { now, nextEvent, nextEventStarts } = useRealtimeFocusData();
  const { focusedEvent, countdown, timeLeft } = useFocused;
  const { start, end, setFocusedEvent } = useFocused;

  useEffect(() => {
    if (focusedEvent) return;

    setFocusedEvent(nextEvent ?? null);
  }, [focusedEvent, nextEvent, setFocusedEvent, start]);

  return {
    now,
    focusedEvent,
    countdown,
    timeLeft,
    nextEvent,
    nextEventStarts,
    start,
    end,
    setFocusedEvent,
  };
}
