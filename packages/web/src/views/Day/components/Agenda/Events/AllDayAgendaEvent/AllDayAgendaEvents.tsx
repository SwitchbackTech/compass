import classNames from "classnames";
import { useState } from "react";
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
  const [ref, setRef] = useState<HTMLElement | null>(null);

  // Sort all-day events by title for consistent TAB order
  const sortedAllDayEvents = [...allDayEvents].sort((a, b) =>
    (a.title || "").localeCompare(b.title || ""),
  );

  return (
    <Droppable
      as="div"
      ref={setRef}
      dndProps={{
        id: ID_GRID_ALLDAY_ROW,
        data: { containerWidth: ref?.clientWidth },
      }}
      data-id="all-day-agendas"
      id={ID_GRID_ALLDAY_ROW}
      aria-label="all day events section"
      className={classNames(
        "max-h-36 min-h-8 cursor-cell space-y-1",
        "overflow-x-hidden overflow-y-auto",
        "border-t border-b border-gray-400/20",
      )}
      style={{
        overscrollBehavior: "contain",
        scrollbarGutter: "stable both-edges",
      }}
      onClick={openEventForm}
    >
      {sortedAllDayEvents.length === 0 ? (
        <div
          className={classNames(
            "flex flex-1 items-center justify-center py-2",
            "text-text-light text-sm",
          )}
        >
          Click to add all day events{" "}
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
