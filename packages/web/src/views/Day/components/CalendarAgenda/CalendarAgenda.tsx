import { useEffect, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { useDayEvents } from "../../data/day.data";
import { useDateInView } from "../../hooks/navigation/useDateInView";
import { CalendarAgendaSkeleton } from "./CalendarAgendaSkeleton";

export function CalendarAgenda() {
  const dateInView = useDateInView();
  const { events, isLoading } = useDayEvents(dateInView);
  const nowMarkerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Center the calendar around the current time when the view mounts
  useEffect(() => {
    nowMarkerRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, []);

  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  // Get position in pixels for a given time (15-minute slots, 20px each)
  const getTimePosition = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const slot = hours * 4 + Math.floor(minutes / 15);
    return slot * 20;
  };

  return (
    <section
      aria-label="calendar-agenda"
      className="bg-darkBlue-400 flex h-full min-w-xs flex-col"
    >
      <div
        ref={scrollRef}
        className="relative flex flex-1 overflow-x-hidden overflow-y-auto"
        data-testid="calendar-scroll"
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
      >
        {/* Time labels column */}
        <div className="bg-darkBlue-400 relative w-16 flex-shrink-0">
          {Array.from({ length: 96 }, (_, i) => {
            const hour = Math.floor(i / 4);
            const minute = (i % 4) * 15;
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
                  top: `${i * 20}px`,
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
              top: `${(currentHour * 4 + Math.floor(currentMinute / 15)) * 20}px`,
            }}
          >
            <div className="bg-red absolute -top-1 -left-2 h-2 w-4 rounded-full"></div>
            <div className="text-red bg-darkBlue-400/90 pointer-events-none absolute -top-2 left-0 z-20 w-16 rounded-sm px-1 text-[11px] leading-none font-medium shadow-sm">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        {/* Events column */}
        <div className="relative ml-1 flex-1">
          <div
            data-testid="calendar-surface"
            style={{ height: `${24 * 4 * 20}px`, position: "relative" }}
          >
            {/* Current time indicator for events column */}
            <div
              className="border-red absolute right-0 left-0 z-30 border-t-2"
              style={{
                top: `${(currentHour * 4 + Math.floor(currentMinute / 15)) * 20}px`,
              }}
            />

            {/* Event blocks */}
            <div className="relative">
              {isLoading ? (
                <CalendarAgendaSkeleton />
              ) : (
                events.map((event) => {
                  if (event.isAllDay) return null; // Skip all-day events for now

                  const startPosition = getTimePosition(
                    dayjs(event.startDate).toDate(),
                  );
                  const endPosition = getTimePosition(
                    dayjs(event.endDate).toDate(),
                  );
                  const blockHeight = endPosition - startPosition;
                  const GAP_PX = 2;
                  const renderedHeight = Math.max(4, blockHeight - GAP_PX);

                  const now = new Date();
                  const isPast = dayjs(event.endDate).toDate() < now;

                  return (
                    <div
                      key={event._id}
                      className={`text-white-100 absolute right-2 left-2 flex items-center rounded bg-blue-200 px-2 text-xs ${
                        isPast ? "opacity-60" : ""
                      }`}
                      style={{
                        height: `${renderedHeight}px`,
                        top: `${startPosition}px`,
                      }}
                      title={`${event.title}\n${formatTime(dayjs(event.startDate).toDate())} - ${formatTime(dayjs(event.endDate).toDate())}`}
                    >
                      <span className="flex-1 truncate">
                        {event.title || "Untitled"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
