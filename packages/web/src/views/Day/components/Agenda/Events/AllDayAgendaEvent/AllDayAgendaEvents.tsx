import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { PointerEvent, memo, useCallback, useMemo } from "react";
import { Key } from "ts-key-enum";
import { UseInteractionsReturn } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { compareEventsByTitle } from "@web/common/utils/event/event.util";
import { Droppable } from "@web/components/DND/Droppable";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { DraggableAllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/DraggableAllDayAgendaEvent";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

export const AllDayAgendaEvents = memo(
  ({
    allDayEvents,
    interactions,
  }: {
    allDayEvents: Schema_Event[];
    interactions: UseInteractionsReturn;
  }) => {
    const draft = useDraft();
    const openEventForm = useOpenEventForm();

    // Sort all-day events by title for consistent TAB order
    const sortedAllDayEvents = useMemo(
      () => [...allDayEvents].sort(compareEventsByTitle),
      [allDayEvents],
    );

    const events = useMemo(() => {
      if (!draft || !StringV4Schema.safeParse(draft._id).success) {
        return sortedAllDayEvents;
      }

      const withoutDraft = sortedAllDayEvents.filter(
        (event) => event._id !== draft._id,
      );

      const allEvents = [draft, ...withoutDraft];

      return allEvents.sort(compareEventsByTitle);
    }, [sortedAllDayEvents, draft]);

    const onEnterKey = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === Key.Enter) {
          e.preventDefault();
          e.stopPropagation();
          openEventForm(e as unknown as PointerEvent<HTMLElement>);
        }
      },
      [openEventForm],
    );

    return (
      <Droppable
        {...interactions?.getReferenceProps({
          onClick: openEventForm,
          onKeyDown: onEnterKey,
        })}
        as="div"
        dndProps={{ id: ID_GRID_ALLDAY_ROW }}
        data-id="all-day-agendas"
        id={ID_GRID_ALLDAY_ROW}
        tabIndex={0}
        aria-label="All-day events section"
        {...(allDayEvents.length > 0
          ? {}
          : { title: "All-day events section" })}
        className={classNames(
          "group flex max-h-36 min-h-8 cursor-cell flex-col gap-1 pt-2",
          "overflow-x-hidden overflow-y-auto",
          "border-t border-gray-400/20",
          "focus-visible:rounded focus-visible:ring-2",
          "focus:outline-none focus-visible:ring-yellow-200",
        )}
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
      >
        {events.map((event) => (
          <DraggableAllDayAgendaEvent
            key={event._id}
            event={event as Schema_GridEvent}
            interactions={interactions}
            isDraftEvent={draft?._id === event._id}
            isNewDraftEvent={!allDayEvents.find((e) => e._id === event?._id)}
          />
        ))}
      </Droppable>
    );
  },
  fastDeepEqual,
);
