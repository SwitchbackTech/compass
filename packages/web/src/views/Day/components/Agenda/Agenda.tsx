import classNames from "classnames";
import { memo, useCallback, useRef } from "react";
import { Key } from "ts-key-enum";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { setDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { AgendaEventPreview } from "@web/views/Day/components/Agenda/Events/AgendaEventPreview/AgendaEventPreview";
import { AllDayAgendaEvents } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { TimedAgendaEvents } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvents";
import { NowLine } from "@web/views/Day/components/Agenda/NowLine/NowLine";
import { TimeLabels } from "@web/views/Day/components/Agenda/TimeLabels/TimeLabels";
import { EventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenu";
import { useAgendaInteractionsAtCursor } from "@web/views/Day/hooks/events/useAgendaInteractionsAtCursor";

const openChange = (open: boolean) => {
  if (!open) setDraft(null);
};

export const Agenda = memo(function Agenda() {
  const events = useAppSelector(selectDayEvents);
  const height = useRef<number>(0);
  const floating = useFloatingAtCursor(openChange);
  const interactions = useAgendaInteractionsAtCursor(floating);
  const timedAgendaRef = useRef<HTMLElement | null>(null);

  // Separate all-day events from timed events
  const allDayEvents = events.filter((event) => event.isAllDay);

  const onEnterKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === Key.Enter) {
      e.preventDefault();
      e.stopPropagation();
      timedAgendaRef.current?.click();
    }
  }, []);

  return (
    <>
      <section
        aria-label="Calendar agenda"
        className="bg-darkBlue-400 flex h-full min-w-xs flex-1 flex-col gap-2 p-0.5"
      >
        <AllDayAgendaEvents
          allDayEvents={allDayEvents}
          interactions={interactions}
        />

        <div
          id={ID_GRID_EVENTS_TIMED}
          ref={(e) => {
            if (e && !height.current) {
              height.current = e.scrollHeight;
            }
          }}
          className={classNames(
            "relative flex flex-1 overflow-x-hidden overflow-y-auto",
            "focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none",
            "focus:outline-none focus-visible:ring-yellow-200",
            "border-t border-gray-400/20 pt-1",
          )}
          data-testid="calendar-scroll"
          tabIndex={0}
          aria-label="Timed events section"
          onKeyDown={onEnterKey}
          {...(events.length > 0
            ? {}
            : { title: "Timed calendar events section" })}
          style={{
            overscrollBehavior: "contain",
            scrollbarGutter: "stable both-edges",
          }}
        >
          <TimeLabels />

          <NowLine />

          <TimedAgendaEvents
            height={height.current}
            interactions={interactions}
            ref={timedAgendaRef}
          />
        </div>
      </section>

      <FloatingEventForm floating={floating} interactions={interactions} />
      <AgendaEventPreview floating={floating} interactions={interactions} />
      <EventContextMenu floating={floating} interactions={interactions} />
    </>
  );
});

Agenda.displayName = "Agenda";
