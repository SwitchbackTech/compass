import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo, useCallback, useMemo, useState } from "react";
import { CSSProperties } from "styled-components";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_OVERLAPPING,
  DATA_EVENT_ELEMENT_Z_INDEX,
} from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { AgendaEventMenu } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger";
import { useEventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

export const DraggableAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    const { openContextMenu, isOpen } = useEventContextMenu();
    const [isFocused, setFocus] = useState(false);
    const { maxAgendaZIndex } = useDraftContextV2();
    const [ref, setRef] = useState<HTMLElement | null>(null);
    const maxZIndex = useMemo(() => maxAgendaZIndex + 2, [maxAgendaZIndex]);

    if (!event.startDate || !event.endDate || event.isAllDay) return null;

    const startDate = new Date(event.startDate);
    const startPosition = getAgendaEventPosition(startDate);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        openContextMenu(event as Schema_Event);
      },
      [event, openContextMenu],
    );

    const focusStyles = useMemo<CSSProperties>(() => {
      if (isFocused) return { zIndex: maxZIndex };

      return {
        zIndex: parseInt(
          ref?.getAttribute(DATA_EVENT_ELEMENT_Z_INDEX) ?? "1",
          10,
        ),
      };
    }, [isFocused, maxZIndex, ref]);

    return (
      <AgendaEventMenu>
        <AgendaEventMenuTrigger asChild>
          <Draggable
            ref={setRef}
            dndProps={{
              id: event._id,
              data: {
                event,
                type: Categories_Event.TIMED,
                view: "day",
              },
            }}
            as="div"
            className={classNames(
              CLASS_TIMED_CALENDAR_EVENT,
              "absolute cursor-move touch-none rounded",
              "focus:ring-2 focus:ring-yellow-200 focus:outline-none",
              {
                "border-border-transparent border shadow-md": Boolean(
                  ref?.getAttribute(DATA_EVENT_ELEMENT_OVERLAPPING),
                ),
              },
            )}
            style={{ top: `${startPosition}px`, ...focusStyles }}
            tabIndex={0}
            role="button"
            data-event-id={event._id}
            aria-label={event.title || "Untitled event"}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => setFocus(true)}
            onMouseLeave={() => setFocus(false)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
          >
            <AgendaEvent event={event} />
          </Draggable>
        </AgendaEventMenuTrigger>

        {isOpen ? null : <AgendaEventMenuContent event={event} />}
      </AgendaEventMenu>
    );
  },
  fastDeepEqual,
);
