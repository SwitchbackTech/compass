import classNames from "classnames";
import { Schema_Event } from "@core/types/event.types";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
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
    <Droppable
      as="div"
      dndProps={{ id: ID_GRID_ALLDAY_ROW }}
      data-id="all-day-agendas"
      id={ID_GRID_ALLDAY_ROW}
      aria-label="all day events section"
      className={classNames(
        "group max-h-36 min-h-8 cursor-cell space-y-1",
        "overflow-x-hidden overflow-y-auto",
        "border-t border-b border-gray-400/20",
      )}
      style={{
        overscrollBehavior: "contain",
        scrollbarGutter: "stable both-edges",
      }}
      onClick={() => openEventForm()}
    >
      {sortedAllDayEvents.length === 0 ? (
        <div
          className={classNames(
            "flex flex-1 items-center justify-center py-2",
            "group-hover:text-white-100 group-focus:text-white-100",
            "text-sm text-gray-200 transition-colors",
          )}
        >
          Click to add all day events
        </div>
      ) : (
        sortedAllDayEvents.map((event) => (
          <DraggableAllDayAgendaEvent
            key={event._id}
            event={event as Schema_GridEvent}
          />
        ))
      )}
    </Droppable>
  );
};
