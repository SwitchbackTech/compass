import classNames from "classnames";
import { useEffect, useState } from "react";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Droppable } from "@web/components/DND/Droppable";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { DraggableAgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/DraggableAgendaEvent";
import { EventContextMenuProvider } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";

const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");

export const AgendaEvents = ({ height }: { height?: number }) => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const { openEventForm } = useDraftContextV2();
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [loadingCount, setLoadingCount] = useState<number>(0);

  useEffect(() => {
    if (isLoading) setLoadingCount((count) => count + 1);
  }, [isLoading]);

  // revert drag offline or http failure

  return (
    <EventContextMenuProvider>
      <Droppable
        as="div"
        dndProps={{
          id: ID_GRID_MAIN,
          data: { containerWidth: ref?.clientWidth },
        }}
        ref={setRef}
        data-testid="calendar-surface"
        id={ID_GRID_MAIN}
        className={classNames(
          "relative ml-1 flex-1 cursor-cell overflow-hidden",
          { isOver: "bg-gray-400/20" },
        )}
        style={{ height }}
        onClick={openEventForm}
      >
        {/* Event blocks */}
        {loadingCount < 1 || ref === null ? (
          <AgendaSkeleton />
        ) : (
          events.map((event) => (
            <DraggableAgendaEvent
              key={event._id}
              event={event}
              containerWidth={ref.clientWidth}
              canvasContext={canvasContext}
            />
          ))
        )}
      </Droppable>
    </EventContextMenuProvider>
  );
};
