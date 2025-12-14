import classNames from "classnames";
import { useCallback } from "react";
import { Key } from "ts-key-enum";
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

  const onEnterKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === Key.Enter) {
        e.preventDefault();
        e.stopPropagation();
        openEventForm();
      }
    },
    [openEventForm],
  );

  return (
    <Droppable
      as="div"
      dndProps={{ id: ID_GRID_ALLDAY_ROW }}
      data-id="all-day-agendas"
      id={ID_GRID_ALLDAY_ROW}
      tabIndex={0}
      aria-label="All-day events section"
      {...(allDayEvents.length > 0 ? {} : { title: "All-day events section" })}
      className={classNames(
        "group flex max-h-36 min-h-8 cursor-cell flex-col gap-1 pt-2",
        "overflow-x-hidden overflow-y-auto",
        "border-t border-gray-400/20",
        "focus-visible:rounded focus-visible:ring-2",
        "focus:outline-none focus-visible:ring-yellow-200",
      )}
      style={{
        overscrollBehavior: "contain",
        scrollbarGutter: "stable both-edges",
      }}
      onClick={() => openEventForm()}
      onKeyDown={onEnterKey}
    >
      {sortedAllDayEvents.map((event) => (
        <DraggableAllDayAgendaEvent
          key={event._id}
          event={event as Schema_GridEvent}
        />
      ))}
    </Droppable>
  );
};
