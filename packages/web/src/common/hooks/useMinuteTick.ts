import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

const TICK_INTERVAL_MS = 60_000;

/** Re-renders every 60s with the current time. Shared by anything that
 * needs to notice the clock moving (today rollover, now-line, up-next). */
export function useMinuteTick(): Dayjs {
  const [now, setNow] = useState<Dayjs>(() => dayjs());

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return now;
}
