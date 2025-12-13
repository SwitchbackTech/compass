import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import {
  ForwardedRef,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { Key } from "ts-key-enum";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { selectDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AgendaEvents } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvents";
import { AllDayAgendaEvents } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvents";
import { NowLine } from "@web/views/Day/components/Agenda/NowLine/NowLine";
import { TimeLabels } from "@web/views/Day/components/Agenda/TimeLabels/TimeLabels";

export const Agenda = memo(
  forwardRef((_: {}, ref: ForwardedRef<{ scrollToNow: () => void }>) => {
    const { pathname } = useLocation();
    const { openEventForm } = useDraftContextV2();
    const nowLineRef = useRef<HTMLDivElement>(null);
    const events = useAppSelector(selectDayEvents);
    const [timedGridRef, setTimedGridRef] = useState<HTMLElement | null>(null);

    // Separate all-day events from timed events
    const allDayEvents = events.filter((event) => event.isAllDay);

    const scrollToNow = useCallback(() => {
      nowLineRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }, []);

    const onEnterKey = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === Key.Enter) {
          e.preventDefault();
          e.stopPropagation();
          openEventForm();
        }
      },
      [openEventForm],
    );

    // Provide the scroll function to parent component
    useImperativeHandle(ref, () => ({ scrollToNow }), [scrollToNow]);

    // Center the calendar around the current time when the view mounts
    useEffect(() => scrollToNow(), [scrollToNow, pathname]);

    return (
      <section
        aria-label="calendar-agenda"
        className="bg-darkBlue-400 flex h-full min-w-xs flex-1 flex-col gap-2 p-0.5"
      >
        <AllDayAgendaEvents allDayEvents={allDayEvents} />

        <div
          id={ID_GRID_EVENTS_TIMED}
          ref={setTimedGridRef}
          className={classNames(
            "relative flex flex-1 overflow-x-hidden overflow-y-auto",
            "focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none",
            "focus:outline-none focus-visible:ring-yellow-200",
          )}
          data-testid="calendar-scroll"
          tabIndex={0}
          aria-label="Timed events section"
          {...(events.length > 0
            ? {}
            : { title: "Timed calendar events section" })}
          onKeyDown={onEnterKey}
          style={{
            overscrollBehavior: "contain",
            scrollbarGutter: "stable both-edges",
          }}
        >
          <TimeLabels />

          <NowLine ref={nowLineRef} />

          <AgendaEvents height={timedGridRef?.scrollHeight} />
        </div>
      </section>
    );
  }),
  fastDeepEqual,
);
