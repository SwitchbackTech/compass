import { useRef } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useMinuteTick } from "@web/common/hooks/useMinuteTick";

// A fresh dayjs() every render permanently invalidates every memo/comparator
// downstream that takes `today` as a dependency (weekProps, grid layout,
// etc.), since it never equals the previous render's instance even though
// the calendar day hasn't changed. Keep the same reference across renders
// within a day; only swap it (checked once a minute, via the shared tick)
// when the day rolls over.
export const useToday = () => {
  const tick = useMinuteTick();
  const todayRef = useRef<Dayjs>(tick);

  if (!todayRef.current.isSame(tick, "day")) {
    todayRef.current = tick;
  }

  const today = todayRef.current;
  const todayIndex = today.get("day");

  return { today, todayIndex };
};
