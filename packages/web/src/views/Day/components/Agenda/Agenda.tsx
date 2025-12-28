import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { BehaviorSubject, distinctUntilChanged } from "rxjs";
import { Key } from "ts-key-enum";
import { distinctUntilArrayItemChanged } from "@ngneat/elf";
import {
  UIEntitiesRef,
  setEntities,
  updateEntities,
} from "@ngneat/elf-entities";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import { useHasLoadedOnce } from "@web/common/hooks/useHasLoadedOnce";
import { useIsDraggingEvent } from "@web/common/hooks/useIsDraggingEvent";
import { CursorItem, nodeId$ } from "@web/common/hooks/useOpenAtCursor";
import { useResizing } from "@web/common/hooks/useResizing";
import { compareEventsByStartDate } from "@web/common/utils/event/event.util";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import {
  selectDayEvents,
  selectIsDayEventsProcessing,
} from "@web/ducks/events/selectors/event.selectors";
import { store } from "@web/store";
import { eventsStore, resetActiveEvent, resetDraft } from "@web/store/events";
import { AgendaEventPreview } from "@web/views/Day/components/Agenda/Events/AgendaEventPreview/AgendaEventPreview";
import { AllDayAgendaEvents } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { TimedAgendaEvents } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvents";
import { LoadingProgressLine } from "@web/views/Day/components/Agenda/LoadingProgressLine/LoadingProgressLine";
import { NowLine } from "@web/views/Day/components/Agenda/NowLine/NowLine";
import { TimeLabels } from "@web/views/Day/components/Agenda/TimeLabels/TimeLabels";
import { EventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenu";
import { useAgendaInteractionsAtCursor } from "@web/views/Day/hooks/events/useAgendaInteractionsAtCursor";

export function Agenda() {
  const entities = selectDayEvents(store.getState());
  const eventsRef = useRef(new BehaviorSubject<Schema_Event[]>(entities));
  const loadingRef = useRef(new BehaviorSubject<boolean>(false));
  const events$ = eventsRef.current;
  const loading$ = loadingRef.current;
  const { timedEventsContainerRef, timedEventsGridRef } = useCompassRefs();
  const [loading, setLoading] = useState(false);
  const [hasTimedEvents, setHasTimedEvents] = useState(false);
  const hasLoadedOnce = useHasLoadedOnce(!!loading, hasTimedEvents);
  const showProgressLine = loading && hasLoadedOnce.current;
  const dragging = useIsDraggingEvent();
  const resizing = useResizing();

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
    enabled: !dragging && !resizing,
  });

  const onEnterKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === Key.Enter) {
      e.preventDefault();
      e.stopPropagation();
      timedEventsGridRef.current?.click();
    }
  }, []);

  useEffect(() => {
    const unsubscribeStore = store.subscribe(() => {
      const state = store.getState();
      const events = selectDayEvents(state);
      const loading = selectIsDayEventsProcessing(state);

      events$.next(events);
      loading$.next(!!loading);
    });

    const loadingSubscription = loading$
      .pipe(distinctUntilChanged())
      .subscribe(setLoading);

    const eventsSubscription = events$
      .pipe(distinctUntilArrayItemChanged())
      .subscribe((events) => {
        const timedEvents = events.filter((e) => !e.isAllDay);

        setHasTimedEvents(timedEvents.length > 0);

        eventsStore.update(
          setEntities(
            events.sort(
              compareEventsByStartDate,
            ) as WithCompassId<Schema_Event>[],
          ),
          updateEntities(
            events.map((e) => e._id!),
            {},
            { ref: UIEntitiesRef },
          ),
        );
      });

    return () => {
      unsubscribeStore();
      eventsSubscription.unsubscribe();
      loadingSubscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <section
        aria-label="Calendar agenda"
        className="bg-bg-primary flex h-full min-w-xs flex-1 flex-col gap-2 p-0.5"
      >
        <AllDayAgendaEvents interactions={interactions} />

        {showProgressLine ? (
          <LoadingProgressLine />
        ) : (
          <div className="h-0.5 border-t border-gray-400/20" />
        )}

        <div
          id={ID_GRID_EVENTS_TIMED}
          ref={timedEventsContainerRef}
          className={classNames(
            "relative mt-1 flex flex-1 overflow-x-hidden overflow-y-auto",
            "focus:outline-none focus-visible:rounded focus-visible:ring-2",
            "focus-visible:ring-yellow-200 focus-visible:outline-none",
            "select-none",
          )}
          data-testid="calendar-scroll"
          tabIndex={0}
          aria-label="Timed events section"
          onKeyDown={onEnterKey}
          {...(hasTimedEvents
            ? {}
            : { title: "Timed calendar events section" })}
          style={{
            overscrollBehavior: "contain",
            scrollbarGutter: "stable both-edges",
          }}
        >
          <TimeLabels />

          <NowLine />

          <TimedAgendaEvents interactions={interactions} />
        </div>
      </section>

      <FloatingEventForm floating={floating} interactions={interactions} />
      <AgendaEventPreview floating={floating} interactions={interactions} />
      <EventContextMenu floating={floating} interactions={interactions} />
    </>
  );
}
