import classNames from "classnames";
import { Schema_Event } from "@core/types/event.types";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { Droppable } from "@web/components/DND/Droppable";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { DraggableAllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/DraggableAllDayAgendaEvent";

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
    <div className="flex flex-col gap-2">
      <Droppable
        as="div"
        dndProps={{ id: ID_GRID_ALLDAY_ROW }}
        data-id="all-day-agendas"
        id={ID_GRID_ALLDAY_ROW}
        aria-label="all day events section"
        className={classNames(
          "max-h-36 min-h-8 cursor-cell space-y-1",
          "overflow-x-hidden overflow-y-scroll",
          "border-t border-b border-gray-400/20",
        )}
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
        onClick={openEventForm}
      >
        {sortedAllDayEvents.map((event) => (
          <DraggableAllDayAgendaEvent key={event._id} event={event} />
        ))}
      </Droppable>

      <button className="text-border-secondary flex-1 rounded-sm border border-dashed border-gray-400/20 p-2 text-sm">
        Add all day event
      </button>
    </div>
  );
};
