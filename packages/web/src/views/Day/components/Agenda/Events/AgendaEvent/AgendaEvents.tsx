import { useState } from "react";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { EventContextMenuProvider } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";

const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");

export const AgendaEvents = ({ height }: { height?: number }) => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const { openEventForm } = useDraftContextV2();
  const [agendaRef, setAgendaRef] = useState<HTMLDivElement | null>(null);

  return (
    <EventContextMenuProvider>
      <div
        data-testid="calendar-surface"
        id={ID_GRID_MAIN}
        className="relative ml-1 flex-1 cursor-cell"
        style={{ height }}
        ref={setAgendaRef}
        onClick={openEventForm}
      >
        {/* Event blocks */}
        {isLoading || agendaRef === null ? (
          <AgendaSkeleton />
        ) : (
          events.map((event) => (
            <AgendaEvent
              key={event._id}
              event={event}
              containerWidth={agendaRef.clientWidth}
              canvasContext={canvasContext}
            />
          ))
        )}
      </div>
    </EventContextMenuProvider>
  );
};
