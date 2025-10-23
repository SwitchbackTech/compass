import { useEffect, useState } from "react";
import { MINUTES_PER_SLOT } from "@web/views/Day/constants/day.constants";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";
import { setupMinuteSync } from "@web/views/Day/util/time/time.util";

export const NowLine = ({
  nowLineRef,
}: {
  nowLineRef: React.RefObject<HTMLDivElement>;
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  useEffect(() => {
    const cleanup = setupMinuteSync(() => {
      setCurrentTime(new Date());
    });

    return cleanup;
  }, []);

  return (
    <div
      ref={nowLineRef}
      data-now-marker="true"
      className="absolute right-0 left-0 z-40 border-t-2 text-yellow-300"
      style={{
        top: `${(currentHour * 4 + Math.floor(currentMinute / MINUTES_PER_SLOT)) * SLOT_HEIGHT}px`,
      }}
    >
      <div className="absolute -top-1 -left-2 h-2 w-4 rounded-full"></div>
      <div className="text-red pointer-events-none absolute -top-2 left-0 z-50 w-16 rounded-sm bg-[#0c0f17] px-1 text-[11px] leading-none font-medium shadow-sm">
        {getAgendaEventTime(currentTime)}
      </div>
    </div>
  );
};
