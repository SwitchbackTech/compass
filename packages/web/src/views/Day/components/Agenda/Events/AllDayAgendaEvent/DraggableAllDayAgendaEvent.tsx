import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo, useCallback } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { CLASS_ALL_DAY_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { AgendaEventMenu } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";
import { useEventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";

export const DraggableAllDayAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    const { openContextMenu, isOpen } = useEventContextMenu();

    const handleContextMenu = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        openContextMenu(event as Schema_Event);
      },
      [event, openContextMenu],
    );

    if (!event.startDate || !event.endDate || !event.isAllDay) return null;

    return (
      <AgendaEventMenu>
        <AgendaEventMenuTrigger asChild>
          <Draggable
            dndProps={{
              id: event._id,
              data: {
                event,
                type: Categories_Event.ALLDAY,
                view: "day",
              },
            }}
            as="div"
            className={classNames(
              CLASS_ALL_DAY_CALENDAR_EVENT,
              "mx-2 cursor-move touch-none rounded first:mt-2 last:mb-8",
              "focus:ring-2 focus:ring-yellow-200 focus:outline-none",
            )}
            title={event.title}
            tabIndex={0}
            role="button"
            aria-label={event.title || "Untitled event"}
            data-event-id={event._id}
            onContextMenu={handleContextMenu}
          >
            <AllDayAgendaEvent event={event} />
          </Draggable>
        </AgendaEventMenuTrigger>
        {isOpen ? null : <AgendaEventMenuContent event={event} />}
      </AgendaEventMenu>
    );
  },
  fastDeepEqual,
);
