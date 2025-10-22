import { useEffect, useRef } from "react";
import { AgendaEvents } from "./AgendaEvents/AgendaEvents";
import { TimeLabels } from "./TimeLabels/TimeLabels";

export function Agenda() {
  const nowMarkerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
