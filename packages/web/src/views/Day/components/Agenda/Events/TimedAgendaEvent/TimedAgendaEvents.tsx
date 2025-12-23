import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { Ref, forwardRef, memo, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { UseInteractionsReturn, useMergeRefs } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { useGridOrganization } from "@web/common/hooks/useGridOrganization";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { Droppable } from "@web/components/DND/Droppable";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { DraggableTimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/DraggableTimedAgendaEvent";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

export const TimedAgendaEvents = memo(
  forwardRef(
    (
      {
        height,
        interactions,
        events,
      }: {
        height?: number;
        events: Schema_Event[];
        interactions: UseInteractionsReturn;
      },
      _ref: Ref<HTMLElement>,
    ) => {
      const { pathname } = useLocation();
      const timedEvents = useAppSelector(selectTimedDayEvents);
      const isLoading = useAppSelector(selectIsDayEventsProcessing);
      const draft = useDraft();
      const openEventForm = useOpenEventForm();
      const [ref, setRef] = useState<HTMLElement | null>(null);
      const mergedRef = useMergeRefs([setRef, _ref]);

      useGridOrganization(ref);

      // Center the calendar around the current time when the view mounts
      useEffect(() => {
        compassEventEmitter.emit(CompassDOMEvents.SCROLL_TO_NOW_LINE);
      }, [pathname]);

      return (
        <Droppable
          {...interactions?.getReferenceProps({ onClick: openEventForm })}
          as="div"
          dndProps={{ id: ID_GRID_MAIN }}
          ref={mergedRef}
          id={ID_GRID_MAIN}
          data-testid="timed-agendas"
          className={classNames("relative ml-1 flex-1 overflow-hidden", {
            isOver: "bg-gray-400/20",
          })}
          style={{ height }}
        >
          {/* Event blocks */}
          {isLoading || ref === null ? (
            <AgendaSkeleton />
          ) : (
            events.map((event) => (
              <DraggableTimedAgendaEvent
                key={event._id}
                event={event as Schema_GridEvent}
                bounds={ref}
                interactions={interactions}
                isDraftEvent={draft?._id === event._id}
                isNewDraftEvent={!timedEvents.find((e) => e._id === event._id)}
              />
            ))
          )}
        </Droppable>
      );
    },
  ),
  fastDeepEqual,
);

TimedAgendaEvents.displayName = "TimedAgendaEvents";
