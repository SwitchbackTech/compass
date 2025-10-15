import React, { useEffect, useRef } from "react";
import { useTodayEvents } from "../hooks/useTodayEvents";

export function CalendarAgenda() {
  const events = useTodayEvents();
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
    <div className="flex h-full flex-col bg-darkBlue-400 min-w-xs">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative flex"
        data-testid="calendar-scroll"
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
      >
        {/* Time labels column */}
        <div className="w-16 flex-shrink-0 relative bg-darkBlue-400">
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
                className="absolute z-20 text-xs text-gray-200 flex items-center pointer-events-none"
                style={{
                  top: `${i * 20}px`,
                  left: "0px",
                  height: "20px",
                  width: "64px",
                }}
              >
                {displayTime && (
                  <span className="w-full pr-2 bg-darkBlue-400 text-right">
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
            className="absolute left-0 right-0 border-t-2 border-red z-30"
            style={{
              top: `${(currentHour * 4 + Math.floor(currentMinute / 15)) * 20}px`,
            }}
          >
            <div className="absolute -left-2 -top-1 w-4 h-2 bg-red rounded-full"></div>
            <div className="absolute left-0 -top-2 w-16 z-20 text-[11px] leading-none text-red font-medium bg-darkBlue-400/90 px-1 rounded-sm pointer-events-none shadow-sm">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        {/* Events column */}
        <div className="flex-1 relative ml-1">
          <div
            data-testid="calendar-surface"
            style={{ height: `${24 * 4 * 20}px`, position: "relative" }}
          >
            {/* Current time indicator for events column */}
            <div
              className="absolute left-0 right-0 border-t-2 border-red z-30"
              style={{
                top: `${(currentHour * 4 + Math.floor(currentMinute / 15)) * 20}px`,
              }}
            />

            {/* Event blocks */}
            <div className="relative">
              {events.map((event) => {
                if (event.isAllDay) return null; // Skip all-day events for now

                const startPosition = getTimePosition(event.startTime);
                const endPosition = getTimePosition(event.endTime);
                const blockHeight = endPosition - startPosition;
                const GAP_PX = 2;
                const renderedHeight = Math.max(4, blockHeight - GAP_PX);

                const now = new Date();
                const isPast = event.endTime < now;

                return (
                  <div
                    key={event.id}
                    className={`absolute left-2 right-2 rounded px-2 text-xs flex items-center bg-blue-200 text-white-100 ${
                      isPast ? "opacity-60" : ""
                    }`}
                    style={{
                      height: `${renderedHeight}px`,
                      top: `${startPosition}px`,
                    }}
                    title={`${event.title}\n${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
                  >
                    <span className="truncate flex-1">
                      {event.title || "Untitled"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
