import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";

export const TimeLabels = () => {
  const { nowLineRef } = useCompassRefs();

  return (
    <div
      ref={nowLineRef}
      className="bg-darkBlue-400 relative w-16 flex-shrink-0"
    >
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
            className="pointer-events-none absolute flex items-center text-xs text-gray-200 select-none"
            style={{
              top: `${i * SLOT_HEIGHT}px`,
              left: "0px",
              height: `${SLOT_HEIGHT}px`,
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
    </div>
  );
};
