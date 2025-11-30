import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { AgendaEventForm } from "@web/views/Day/components/Agenda/AgendaEventForm/AgendaEventForm";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { EventContextMenuProvider } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";
import { useDayDraftContext } from "@web/views/Day/context/DayDraftContext";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { getNowLinePosition } from "@web/views/Day/util/agenda/agenda.util";

const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");

export const AgendaEvents = () => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const currentTime = new Date();
  const agendaRef = useRef<HTMLDivElement>(null);
  const [isRefSet, setIsRefSet] = useState(false);
  const dateInView = useDateInView();
  const { openFormAtPosition, isFormOpen } = useDayDraftContext();

  useLayoutEffect(() => {
    if (agendaRef.current) {
      setIsRefSet(true);
    }
  }, []);

  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only handle clicks directly on the grid surface, not on events
      if (e.target !== e.currentTarget) {
        return;
      }

      // Don't open form if it's already open
      if (isFormOpen) {
        return;
      }

      const rect = agendaRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate Y position relative to the grid
      const yPosition =
        e.clientY - rect.top + (agendaRef.current?.scrollTop ?? 0);

      openFormAtPosition(yPosition, dateInView, e.clientX, e.clientY);
    },
    [dateInView, openFormAtPosition, isFormOpen],
  );

  return (
    <EventContextMenuProvider>
      <div
        data-testid="calendar-surface"
        className="relative ml-1 flex-1 cursor-pointer"
        ref={agendaRef}
        onClick={handleGridClick}
        role="grid"
        aria-label="Calendar grid - click to create event"
      >
        {/* Current time indicator for events column */}
        <div
          className="absolute right-0 left-0 z-30 border-t-2"
          style={{
            top: `${getNowLinePosition(currentTime)}px`,
          }}
        />

        {/* Event blocks */}
        {isLoading || !isRefSet ? (
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

      {/* Event creation form */}
      <AgendaEventForm />
    </EventContextMenuProvider>
  );
};
