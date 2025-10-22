import { useEffect, useRef } from "react";
import { useDayEvents } from "@web/views/Day/data/day.data";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { AgendaEvents } from "./Events/AgendaEvent/AgendaEvents";
import { AllDayAgendaEvents } from "./Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { TimeLabels } from "./TimeLabels/TimeLabels";

export function Agenda() {
  const nowMarkerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateInView = useDateInView();
  const { events } = useDayEvents(dateInView);

  // Separate all-day events from timed events
  const allDayEvents = events.filter((event) => event.isAllDay);

  // Center the calendar around the current time when the view mounts
  useEffect(() => {
    nowMarkerRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, []);

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
        <TimeLabels nowMarkerRef={nowMarkerRef} />

        <AgendaEvents />
      </div>
    </section>
  );
}
