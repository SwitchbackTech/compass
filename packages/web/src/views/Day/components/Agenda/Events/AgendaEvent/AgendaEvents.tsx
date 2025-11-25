import { useRef } from "react";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { getNowLinePosition } from "@web/views/Day/util/agenda/agenda.util";
import { EventContextMenuProvider } from "../../../ContextMenu/EventContextMenuContext";
import { AgendaSkeleton } from "../../AgendaSkeleton/AgendaSkeleton";
import { AgendaEvent } from "./AgendaEvent";

export const AgendaEvents = () => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const currentTime = new Date();
  const agendaRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const canvasContext = canvas.current.getContext("2d");

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
        {isLoading ? (
          <AgendaSkeleton />
        ) : (
          events.map((event) => (
            <AgendaEvent
              key={event._id}
              event={event}
              containerWidth={agendaRef.current?.clientWidth ?? 100}
              canvasContext={canvasContext}
            />
          ))
        )}
      </div>
    </EventContextMenuProvider>
  );
};
