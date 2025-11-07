import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { useDayEvents } from "@web/views/Day/data/day.data";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { getNowLinePosition } from "@web/views/Day/util/agenda/agenda.util";
import { AgendaSkeleton } from "../../AgendaSkeleton/AgendaSkeleton";
import { AgendaEvent } from "./AgendaEvent";

export const AgendaEvents = () => {
  const dateInView = useDateInView();
  const { events, isLoading } = useDayEvents(dateInView);
  const currentTime = new Date();

  // Filter out all-day events and sort timed events by start time for consistent TAB order
  const timedEvents = events
    .filter((event) => !event.isAllDay)
    .sort(
      (a, b) =>
        new Date(a.startDate as string).getTime() -
        new Date(b.startDate as string).getTime(),
    );

  return (
    <div className="relative ml-1 flex-1">
      <div
        data-testid="calendar-surface"
        style={{
          height: `${24 * 4 * SLOT_HEIGHT}px`,
          position: "relative",
        }}
      >
        {/* Current time indicator for events column */}
        <div
          className="border-red absolute right-0 left-0 z-30 border-t-2"
          style={{
            top: `${getNowLinePosition(currentTime)}px`,
          }}
        />

        {/* Event blocks */}
        <div className="relative">
          {isLoading ? (
            <AgendaSkeleton />
          ) : (
            timedEvents.map((event) => (
              <AgendaEvent key={event._id} event={event} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
