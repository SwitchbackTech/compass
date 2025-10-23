import { MINUTES_PER_SLOT } from "@web/views/Day/constants/day.constants";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";

export const NowLine = ({
  nowLineRef,
}: {
  nowLineRef: React.RefObject<HTMLDivElement>;
}) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  return (
    <div
      ref={nowLineRef}
      data-now-marker="true"
      className="border-red absolute right-0 left-0 z-30 border-t-2"
      style={{
        top: `${(currentHour * 4 + Math.floor(currentMinute / MINUTES_PER_SLOT)) * SLOT_HEIGHT}px`,
      }}
    >
      <div className="bg-red absolute -top-1 -left-2 h-2 w-4 rounded-full"></div>
      <div className="text-red bg-darkBlue-400/90 pointer-events-none absolute -top-2 left-0 z-20 w-16 rounded-sm px-1 text-[11px] leading-none font-medium shadow-sm">
        {getAgendaEventTime(currentTime)}
      </div>
    </div>
  );
};
