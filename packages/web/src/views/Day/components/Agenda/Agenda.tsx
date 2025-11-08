import { useCallback, useEffect, useRef } from "react";
import { Schema_Event } from "@core/types/event.types";
import { useDayEvents } from "@web/views/Day/data/day.data";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { AgendaEvents } from "./Events/AgendaEvent/AgendaEvents";
import { AllDayAgendaEvents } from "./Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { NowLine } from "./NowLine/NowLine";
import { TimeLabels } from "./TimeLabels/TimeLabels";

interface AgendaProps {
  onScrollToNowLineReady?: (scrollToNowLine: () => void) => void;
  onDeleteEvent?: (event: Schema_Event) => void;
}

export const Agenda = ({
  onScrollToNowLineReady,
  onDeleteEvent,
}: AgendaProps) => {
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateInView = useDateInView();
  const { events } = useDayEvents(dateInView);

  // Separate all-day events from timed events
  const allDayEvents = events.filter((event) => event.isAllDay);

  const scrollToNowLine = useCallback(() => {
    nowLineRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, []);

  // Provide the scroll function to parent component
  useEffect(() => {
    if (onScrollToNowLineReady) {
      onScrollToNowLineReady(scrollToNowLine);
    }
  }, [onScrollToNowLineReady, scrollToNowLine]);

  // Center the calendar around the current time when the view mounts
  useEffect(() => {
    scrollToNowLine();
  }, [scrollToNowLine]);

  return (
    <section
      aria-label="calendar-agenda"
      className="bg-darkBlue-400 flex h-full min-w-xs flex-col"
    >
      <AllDayAgendaEvents allDayEvents={allDayEvents} />
      <div
        ref={scrollRef}
        className="relative flex flex-1 overflow-x-hidden overflow-y-auto"
        data-testid="calendar-scroll"
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
      >
        <TimeLabels />

        <NowLine nowLineRef={nowLineRef} />

        <AgendaEvents onDeleteEvent={onDeleteEvent} />
      </div>
    </section>
  );
};
