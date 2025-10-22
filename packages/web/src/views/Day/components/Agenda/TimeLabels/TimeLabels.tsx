import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";

export const TimeLabels = ({
  nowMarkerRef,
}: {
  nowMarkerRef: React.RefObject<HTMLDivElement>;
}) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  return (
    <div className="bg-darkBlue-400 relative w-16 flex-shrink-0">
      {Array.from({ length: 96 }, (_, i) => {
        const hour = Math.floor(i / 4);
        const minute = (i % 4) * MINUTES_PER_SLOT;
        const displayTime =
          minute === 0
            ? `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${
                hour < 12 ? "am" : "pm"
              }`
            : "";

        return (
          <div
            key={`time-${i}`}
            className="pointer-events-none absolute z-20 flex items-center text-xs text-gray-200"
            style={{
              top: `${i * SLOT_HEIGHT}px`,
              left: "0px",
              height: "20px",
              width: "64px",
            }}
          >
            {displayTime && (
              <span className="bg-darkBlue-400 w-full pr-2 text-right">
                {displayTime}
              </span>
            )}
          </div>
        );
      })}

      {/* Current time indicator for time column */}
      <div
        ref={nowMarkerRef}
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
    </div>
  );
};
