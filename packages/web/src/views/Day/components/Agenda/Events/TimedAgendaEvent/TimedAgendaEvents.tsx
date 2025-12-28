import fastDeepEqual from "fast-deep-equal/react";
import { MouseEvent, memo, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { UseInteractionsReturn } from "@floating-ui/react";
import { useObservable } from "@ngneat/use-observable";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { useHasLoadedOnce } from "@web/common/hooks/useHasLoadedOnce";
import { useMainGridSelectionState } from "@web/common/hooks/useMainGridSelectionState";
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
import { timedEvents$ } from "@web/store/events";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { DraggableTimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/DraggableTimedAgendaEvent";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

export const TimedAgendaEvents = memo(
  ({ interactions }: { interactions: UseInteractionsReturn }) => {
    const { pathname } = useLocation();
    const [events] = useObservable(timedEvents$);
    const openEventForm = useOpenEventForm();
    const { timedEventsContainerRef, timedEventsGridRef } = useCompassRefs();
    const timedEvents = useAppSelector(selectTimedDayEvents);
    const isLoading = useAppSelector(selectIsDayEventsProcessing);
    const { selecting } = useMainGridSelectionState();
    const draft = useDraft();
    const grid = timedEventsGridRef.current;
    const height = timedEventsContainerRef.current?.scrollHeight ?? 0;
    const hasLoadedOnce = useHasLoadedOnce(!!isLoading, grid !== null);
    const loadedOnce = hasLoadedOnce.current;
    const showSkeleton = (isLoading || grid === null) && !loadedOnce;

    const handleGridClick = useCallback(
      (e: MouseEvent) => {
        if (selecting) return;

        openEventForm(e);
      },
      [selecting, openEventForm],
    );

    // Center the calendar around the current time when the view mounts
    useEffect(() => {
      compassEventEmitter.emit(CompassDOMEvents.SCROLL_TO_NOW_LINE);
    }, [pathname]);

    return (
      <Droppable
        {...interactions?.getReferenceProps({ onClick: handleGridClick })}
        as="div"
        dndProps={{ id: ID_GRID_MAIN }}
        ref={timedEventsGridRef}
        id={ID_GRID_MAIN}
        data-testid="timed-agendas"
        className="relative ml-1 flex-1 overflow-hidden"
        style={{ height }}
      >
        {/* Event blocks */}
        {showSkeleton ? (
          <AgendaSkeleton />
        ) : (
          events.map((event) => (
            <DraggableTimedAgendaEvent
              key={event._id}
              event={event as Schema_GridEvent}
              interactions={interactions}
              isDraftEvent={draft?._id === event._id}
              isNewDraftEvent={!timedEvents.find((e) => e._id === event._id)}
            />
          ))
        )}
      </Droppable>
    );
  },
  fastDeepEqual,
);

TimedAgendaEvents.displayName = "TimedAgendaEvents";
