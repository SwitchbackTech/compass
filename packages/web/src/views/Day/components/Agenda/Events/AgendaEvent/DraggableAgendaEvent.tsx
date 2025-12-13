import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import {
  FocusEvent,
  MouseEvent,
  memo,
  useCallback,
  useMemo,
  useState,
} from "react";
import { CSSProperties } from "styled-components";
import { Categories_Event } from "@core/types/event.types";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_OVERLAPPING,
  DATA_EVENT_ELEMENT_Z_INDEX,
} from "@web/common/constants/web.constants";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { useMaxAgendaZIndex } from "@web/views/Day/hooks/events/useMaxAgendaZIndex";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

export const DraggableAgendaEvent = memo(
  ({ event }: { event: Schema_GridEvent }) => {
    const context = useDraftContextV2();
    const { openAgendaEventPreview, openEventContextMenu } = context;
    const { nodeId, closeOpenedAtCursor } = context;
    const preventBlur = nodeId !== CursorItem.EventPreview;
    const [isFocused, setFocus] = useState(false);
    const maxAgendaZIndex = useMaxAgendaZIndex();
    const [ref, setRef] = useState<HTMLElement | null>(null);
    const maxZIndex = useMemo(() => maxAgendaZIndex + 2, [maxAgendaZIndex]);

    if (!event.startDate || !event.endDate || event.isAllDay) return null;

    const startDate = new Date(event.startDate);
    const startPosition = getAgendaEventPosition(startDate);

    const focusStyles = useMemo<CSSProperties>(() => {
      if (isFocused) return { zIndex: maxZIndex };

      return {
        zIndex: parseInt(
          ref?.getAttribute(DATA_EVENT_ELEMENT_Z_INDEX) ?? "0",
          10,
        ),
      };
    }, [isFocused, maxZIndex, ref]);

    const focusEvent = useCallback(
      (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // console.log("focusing event", isOpen);
        // if (isOpen) setFocus(false);
        setFocus(true);
        openAgendaEventPreview(e);
      },
      [setFocus, openAgendaEventPreview],
    );

    const blurEvent = useCallback(
      (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (preventBlur) return;

        setFocus(false);
        closeOpenedAtCursor(e);
      },
      [preventBlur, setFocus, closeOpenedAtCursor],
    );

    return (
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
          "absolute cursor-move touch-none rounded focus:outline-none",
          "focus-visible:rounded focus-visible:ring-2",
          "focus:outline-none focus-visible:ring-yellow-200",
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
        onContextMenu={openEventContextMenu}
        onMouseEnter={focusEvent}
        onMouseLeave={blurEvent}
        onFocus={focusEvent}
        onBlur={blurEvent}
      >
        <AgendaEvent event={event} />
      </Draggable>
    );
  },
  fastDeepEqual,
);
