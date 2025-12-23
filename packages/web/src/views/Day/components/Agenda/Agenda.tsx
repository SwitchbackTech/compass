import classNames from "classnames";
import { useCallback, useEffect, useRef } from "react";
import { Key } from "ts-key-enum";
import { useDndContext } from "@dnd-kit/core";
import {
  UIEntitiesRef,
  setEntities,
  updateEntities,
} from "@ngneat/elf-entities";
import { useObservable } from "@ngneat/use-observable";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import { useHasLoadedOnce } from "@web/common/hooks/useHasLoadedOnce";
import { CursorItem, nodeId$ } from "@web/common/hooks/useOpenAtCursor";
import { compareEventsByStartDate } from "@web/common/utils/event/event.util";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import {
  selectDayEvents,
  selectIsDayEventsProcessing,
} from "@web/ducks/events/selectors/event.selectors";
import {
  allDayEvents$,
  eventsStore,
  resetActiveEvent,
  resetDraft,
  timedEvents$,
} from "@web/store/events";
import { useAppSelector } from "@web/store/store.hooks";
import { AgendaEventPreview } from "@web/views/Day/components/Agenda/Events/AgendaEventPreview/AgendaEventPreview";
import { AllDayAgendaEvents } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { TimedAgendaEvents } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvents";
import { LoadingProgressLine } from "@web/views/Day/components/Agenda/LoadingProgressLine/LoadingProgressLine";
import { NowLine } from "@web/views/Day/components/Agenda/NowLine/NowLine";
import { TimeLabels } from "@web/views/Day/components/Agenda/TimeLabels/TimeLabels";
import { EventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenu";
import { useAgendaInteractionsAtCursor } from "@web/views/Day/hooks/events/useAgendaInteractionsAtCursor";

export function Agenda() {
  const { active } = useDndContext();
  const reduxEvents = useAppSelector(selectDayEvents);
  const [allDayEvents] = useObservable(allDayEvents$);
  const [timedEvents] = useObservable(timedEvents$);
  const height = useRef<number>(0);
  const timedAgendaRef = useRef<HTMLElement | null>(null);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const hasLoadedOnce = useHasLoadedOnce(!!isLoading, timedEvents.length >= 0);

  const floating = useFloatingAtCursor((open, _e, reason) => {
    const dismissed = reason === "escape-key" || reason === "outside-press";

    if (!open && dismissed) {
      const nodeId = nodeId$.getValue();

      if (nodeId === CursorItem.EventForm) {
        resetDraft();
      } else {
        resetActiveEvent();
      }
    }
  });

  const interactions = useAgendaInteractionsAtCursor(floating, {
    enabled: !active,
  });

  const onEnterKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === Key.Enter) {
      e.preventDefault();
      e.stopPropagation();
      timedAgendaRef.current?.click();
    }
  }, []);

  useEffect(() => {
    eventsStore.update(
      setEntities(
        [...reduxEvents].sort(
          compareEventsByStartDate,
        ) as WithCompassId<Schema_Event>[],
      ),
      updateEntities(
        reduxEvents.map((e) => e._id!),
        {},
        { ref: UIEntitiesRef },
      ),
    );
  }, [reduxEvents]);

  const showProgressLine = isLoading && hasLoadedOnce.current;

  return (
    <>
      <section
        aria-label="Calendar agenda"
        className="bg-bg-primary flex h-full min-w-xs flex-1 flex-col gap-2 p-0.5"
      >
        <AllDayAgendaEvents events={allDayEvents} interactions={interactions} />

        {showProgressLine ? (
          <LoadingProgressLine />
        ) : (
          <div className="h-0.5 border-t border-gray-400/20" />
        )}

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
            "mt-1 focus:outline-none focus-visible:ring-yellow-200",
          )}
          data-testid="calendar-scroll"
          tabIndex={0}
          aria-label="Timed events section"
          onKeyDown={onEnterKey}
          {...(timedEvents.length > 0
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
            events={timedEvents}
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
}
