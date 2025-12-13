import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { FocusEvent, MouseEvent, memo, useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { CLASS_ALL_DAY_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";

export const DraggableAllDayAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    const context = useDraftContextV2();
    const { openAgendaEventPreview, openEventContextMenu } = context;
    const { nodeId, closeOpenedAtCursor } = context;
    const preventBlur = nodeId !== CursorItem.EventPreview;

    const blurEvent = useCallback(
      (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (preventBlur) return;

        closeOpenedAtCursor(e);
      },
      [preventBlur, closeOpenedAtCursor],
    );

    if (!event.startDate || !event.endDate || !event.isAllDay) return null;

    return (
      <Draggable
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
          "mx-2 cursor-move touch-none rounded first:mt-2 last:mb-8",
          "focus-visible:ring-2",
          "focus:outline-none focus-visible:ring-yellow-200",
        )}
        title={event.title}
        tabIndex={0}
        role="button"
        aria-label={event.title || "Untitled event"}
        data-event-id={event._id}
        onContextMenu={openEventContextMenu}
        onMouseEnter={openAgendaEventPreview}
        // onMouseLeave={blurEvent}
        // onFocus={openAgendaEventPreview}
        // onBlur={blurEvent}
      >
        <AllDayAgendaEvent event={event} />
      </Draggable>
    );
  },
  fastDeepEqual,
);
