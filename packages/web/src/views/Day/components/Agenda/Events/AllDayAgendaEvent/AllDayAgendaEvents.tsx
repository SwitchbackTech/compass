import { Schema_Event } from "@core/types/event.types";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";

export const AllDayAgendaEvents = ({
  allDayEvents,
}: {
  allDayEvents: Schema_Event[];
}) => {
  const { openEventForm } = useDraftContextV2();

  // Sort all-day events by title for consistent TAB order
  const sortedAllDayEvents = [...allDayEvents].sort((a, b) =>
    (a.title || "").localeCompare(b.title || ""),
  );

  return (
    <div
      data-id="all-day-agendas"
      id={ID_GRID_ALLDAY_ROW}
      className="cursor-cell space-y-1 px-4 py-2"
      onClick={openEventForm}
    >
      {sortedAllDayEvents.map((event) => (
        <AllDayAgendaEvent key={event._id} event={event} />
      ))}
    </div>
  );
};
