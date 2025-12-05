import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal";
import { memo } from "react";
import { Categories_Event } from "@core/types/event.types";
import { CLASS_ALL_DAY_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { AgendaEventMenu } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";

export const DraggableAllDayAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    if (!event.title) return null;

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
              "touch-none last:mb-8",
            )}
            title={event.title}
            tabIndex={0}
            role="button"
            aria-label={event.title || "Untitled event"}
            data-event-id={event._id}
          >
            <AllDayAgendaEvent event={event} over={null} />
          </Draggable>
        </AgendaEventMenuTrigger>
        <AgendaEventMenuContent event={event} />
      </AgendaEventMenu>
    );
  },
  fastDeepEqual,
);
