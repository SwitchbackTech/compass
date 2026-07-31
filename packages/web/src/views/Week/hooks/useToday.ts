import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

const CHECK_INTERVAL_MS = 60_000;

// A fresh dayjs() every render permanently invalidates every memo/comparator
// downstream that takes `today` as a dependency (weekProps, grid layout,
// etc.), since it never equals the previous render's instance even though
// the calendar day hasn't changed. Keep the same reference across renders
// within a day; only swap it (checked once a minute) when the day rolls
// over.
export const useToday = () => {
  const [today, setToday] = useState<Dayjs>(() => dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setToday((current) => {
        const next = dayjs();
        return current.isSame(next, "day") ? current : next;
      });
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const todayIndex = today.get("day");

  return { today, todayIndex };
};
