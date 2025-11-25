import { useRef } from "react";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { EventContextMenuProvider } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";
import { getNowLinePosition } from "@web/views/Day/util/agenda/agenda.util";

const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");

export const AgendaEvents = () => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const currentTime = new Date();
  const agendaRef = useRef<HTMLDivElement>(null);

  return (
    <EventContextMenuProvider>
      <div
        data-testid="calendar-surface"
        className="relative ml-1 flex-1"
        ref={agendaRef}
      >
        {/* Current time indicator for events column */}
        <div
          className="absolute right-0 left-0 z-30 border-t-2"
          style={{
            top: `${getNowLinePosition(currentTime)}px`,
          }}
        />

        {/* Event blocks */}
        {isLoading || agendaRef.current === null ? (
          <AgendaSkeleton />
        ) : (
          events.map((event) => (
            <AgendaEvent
              key={event._id}
              event={event}
              containerWidth={agendaRef.current!.clientWidth}
              canvasContext={canvasContext}
            />
          ))
        )}
      </div>
    </EventContextMenuProvider>
  );
};
