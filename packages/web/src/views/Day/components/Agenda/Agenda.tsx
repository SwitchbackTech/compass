import { useCallback, useEffect, useRef } from "react";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { AgendaEvents } from "./Events/AgendaEvent/AgendaEvents";
import { AllDayAgendaEvents } from "./Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { NowLine } from "./NowLine/NowLine";
import { TimeLabels } from "./TimeLabels/TimeLabels";

interface AgendaProps {
  onScrollToNowLineReady?: (scrollToNowLine: () => void) => void;
}

export const Agenda = ({ onScrollToNowLineReady }: AgendaProps) => {
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const events = useAppSelector(selectDayEvents);

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
        className="relative z-5 flex flex-1 overflow-x-hidden overflow-y-auto"
        data-testid="calendar-scroll"
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
      >
        <TimeLabels />

        <NowLine nowLineRef={nowLineRef} />

        <AgendaEvents />
      </div>
    </section>
  );
};
