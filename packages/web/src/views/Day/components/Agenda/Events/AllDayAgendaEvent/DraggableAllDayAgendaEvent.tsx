import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { FocusEvent, MouseEvent, memo, useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { CLASS_ALL_DAY_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";

export const DraggableAllDayAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    const context = useDraftContextV2();
    const { nodeId, interactions, closeOpenAtCursor } = useOpenAtCursor();
    const { openAgendaEventPreview, openEventContextMenu } = context;
    const preventBlur = nodeId && nodeId !== CursorItem.EventPreview;

    if (!event.startDate || !event.endDate || !event.isAllDay) return null;

    const blurEvent = useCallback(
      (e: MouseEvent<Element> | FocusEvent<Element>) => {
        e.preventDefault();
        e.stopPropagation();

        if (preventBlur) return;

        closeOpenAtCursor();
      },
      [closeOpenAtCursor, preventBlur],
    );

    return (
      <Draggable
        {...interactions.getReferenceProps({
          onClick: () => {}, // no-op, click already set on ID_GRID_ALLDAY_ROW
          onContextMenu: openEventContextMenu,
          onMouseEnter: openAgendaEventPreview,
          onFocus: openAgendaEventPreview,
          onMouseLeave: blurEvent,
          onBlur: blurEvent,
        })}
        dndProps={{
          id: event._id,
          data: {
            event,
            type: Categories_Event.ALLDAY,
            view: "day",
          },
        }}
        as="div"
        className={classNames(
          CLASS_ALL_DAY_CALENDAR_EVENT,
          "mx-2 cursor-move touch-none rounded",
          "focus-visible:ring-2",
          "focus:outline-none focus-visible:ring-yellow-200",
        )}
        title={event.title}
        tabIndex={0}
        role="button"
        aria-label={event.title || "Untitled event"}
        data-event-id={event._id}
      >
        <AllDayAgendaEvent event={event} />
      </Draggable>
    );
  },
  fastDeepEqual,
);

DraggableAllDayAgendaEvent.displayName = "DraggableAllDayAgendaEvent";
