import { Schema_Event } from "@core/types/event.types";
import { AllDayAgendaEvent } from "./AllDayAgendaEvent";

export const AllDayAgendaEvents = ({
  allDayEvents,
}: {
  allDayEvents: Schema_Event[];
}) => {
  // Sort all-day events by title for consistent TAB order
  const sortedAllDayEvents = [...allDayEvents].sort((a, b) =>
    (a.title || "").localeCompare(b.title || ""),
  );

  return (
    <div className="space-y-1 px-4 py-2">
      {sortedAllDayEvents.map((event) => (
        <AllDayAgendaEvent key={event._id} event={event} />
      ))}
    </div>
  );
};
