import { useCallback, useEffect, useRef, useState } from "react";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { AgendaEvents } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvents";
import { AllDayAgendaEvents } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { NowLine } from "@web/views/Day/components/Agenda/NowLine/NowLine";
import { TimeLabels } from "@web/views/Day/components/Agenda/TimeLabels/TimeLabels";
import { EventContextMenuProvider } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";

interface AgendaProps {
  onScrollToNowLineReady?: (scrollToNowLine: () => void) => void;
}

export const Agenda = ({ onScrollToNowLineReady }: AgendaProps) => {
  const nowLineRef = useRef<HTMLDivElement>(null);
  const events = useAppSelector(selectDayEvents);
  const [height, setHeight] = useState<number | undefined>(undefined);

  // Separate all-day events from timed events
  const allDayEvents = events.filter((event) => event.isAllDay);

  const scrollToNowLine = useCallback(() => {
    nowLineRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }, []);

  const setHeightRef = useCallback(
    (e: HTMLDivElement | null) => setHeight(e?.scrollHeight),
    [setHeight],
  );

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
    <EventContextMenuProvider>
      <section
        aria-label="calendar-agenda"
        className="bg-darkBlue-400 flex h-full min-w-xs flex-1 flex-col gap-2"
      >
        <AllDayAgendaEvents allDayEvents={allDayEvents} />

        <div
          id={ID_GRID_EVENTS_TIMED}
          ref={setHeightRef}
          className="relative flex flex-1 overflow-x-hidden overflow-y-auto"
          data-testid="calendar-scroll"
          style={{
            overscrollBehavior: "contain",
            scrollbarGutter: "stable both-edges",
          }}
        >
          <TimeLabels />

          <NowLine nowLineRef={nowLineRef} />

          <AgendaEvents height={height} />
        </div>
      </section>
    </EventContextMenuProvider>
  );
};
