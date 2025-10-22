import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";

/**
 * Skeleton component that mimics event blocks in the calendar agenda
 * Shows animated placeholder bars at various time positions during loading
 */
export function AgendaSkeleton() {
  const getPositionFromTime = (hour: number, minute: number) => {
    const minutesFromMidnight = hour * 60 + minute;
    return (minutesFromMidnight / MINUTES_PER_SLOT) * SLOT_HEIGHT;
  };

  const getHeightFromDuration = (durationMinutes: number) => {
    return (durationMinutes / MINUTES_PER_SLOT) * SLOT_HEIGHT;
  };

  const skeletonBars = [
    {
      top: getPositionFromTime(6, 0),
      height: getHeightFromDuration(75),
      width: "82%",
    }, // 6:00am - 7:15am
    {
      top: getPositionFromTime(9, 30),
      height: getHeightFromDuration(45),
      width: "88%",
    }, // 9:30am - 10:15am
    {
      top: getPositionFromTime(13, 0),
      height: getHeightFromDuration(90),
      width: "78%",
    }, // 1:00pm - 2:30pm
    {
      top: getPositionFromTime(16, 30),
      height: getHeightFromDuration(60),
      width: "84%",
    }, // 4:30pm - 5:30pm
    {
      top: getPositionFromTime(20, 30),
      height: getHeightFromDuration(90),
      width: "76%",
    }, // 8:30pm - 10:00pm
  ];

  return (
    <div className="pointer-events-none absolute inset-0">
      {skeletonBars.map((bar, index) => (
        <div
          key={index}
          className="absolute right-2 left-2 animate-pulse rounded bg-gray-300"
          style={{
            top: `${bar.top}px`,
            height: `${bar.height}px`,
            width: bar.width,
          }}
        />
      ))}
    </div>
  );
}
