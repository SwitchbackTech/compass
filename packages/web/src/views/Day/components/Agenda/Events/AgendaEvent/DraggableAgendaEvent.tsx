import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo, useCallback } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { CLASS_TIMED_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { AgendaEventMenu } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger";
import { useEventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

export const DraggableAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    const { openContextMenu, isOpen } = useEventContextMenu();

    if (!event.startDate || !event.endDate || event.isAllDay) return null;

    const startDate = new Date(event.startDate);
    const startPosition = getAgendaEventPosition(startDate);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        openContextMenu(event as Schema_Event, { x: e.clientX, y: e.clientY });
      },
      [event, openContextMenu],
    );

    return (
      <AgendaEventMenu>
        <AgendaEventMenuTrigger asChild>
          <Draggable
            dndProps={{
              id: event._id,
              data: {
                event,
                type: Categories_Event.TIMED,
                view: "day",
              },
            }}
            as="div"
            className={classNames(
              CLASS_TIMED_CALENDAR_EVENT,
              "absolute cursor-move touch-none rounded",
              "focus:ring-2 focus:ring-yellow-200 focus:outline-none",
              {
                "border-border-transparent border":
                  event.position.isOverlapping,
                "shadow-md hover:!z-40 focus:!z-40":
                  event.position.isOverlapping,
              },
            )}
            style={{ top: `${startPosition}px` }}
            tabIndex={0}
            role="button"
            data-event-id={event._id}
            aria-label={event.title || "Untitled event"}
            onContextMenu={handleContextMenu}
          >
            <AgendaEvent event={event} />
          </Draggable>
        </AgendaEventMenuTrigger>

        {isOpen ? null : <AgendaEventMenuContent event={event} />}
      </AgendaEventMenu>
    );
  },
  fastDeepEqual,
);
