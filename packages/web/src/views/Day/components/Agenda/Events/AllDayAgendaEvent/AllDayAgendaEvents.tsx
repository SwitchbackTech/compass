import { Schema_Event } from "@core/types/event.types";
import { AllDayAgendaEvent } from "./AllDayAgendaEvent";

export const AllDayAgendaEvents = ({
  allDayEvents,
}: {
  allDayEvents: Schema_Event[];
}) => {
  return (
    <div className="space-y-1 px-4 py-2">
      {allDayEvents.map((event) => (
        <AllDayAgendaEvent key={event._id} event={event} />
      ))}
    </div>
  );
};
