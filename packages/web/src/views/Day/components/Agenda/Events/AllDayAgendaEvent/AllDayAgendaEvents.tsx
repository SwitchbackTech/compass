import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { PointerEvent, memo, useCallback } from "react";
import { Key } from "ts-key-enum";
import { UseInteractionsReturn } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Droppable } from "@web/components/DND/Droppable";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { DraggableAllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/DraggableAllDayAgendaEvent";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";

export const AllDayAgendaEvents = memo(
  ({
    events,
    interactions,
  }: {
    events: Schema_Event[];
    interactions: UseInteractionsReturn;
  }) => {
    const draft = useDraft();
    const openEventForm = useOpenEventForm();

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
        {...(events.length > 0 ? {} : { title: "All-day events section" })}
        className={classNames(
          "group flex max-h-36 min-h-8 flex-col gap-1 pt-2",
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
            isNewDraftEvent={!events.find((e) => e._id === event?._id)}
          />
        ))}
      </Droppable>
    );
  },
  fastDeepEqual,
);
