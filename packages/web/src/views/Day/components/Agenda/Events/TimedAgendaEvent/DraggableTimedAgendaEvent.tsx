import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { UseInteractionsReturn } from "@floating-ui/react";
import {
  Categories_Event,
  Schema_Event,
  WithCompassId,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CLASS_TIMED_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { useEventResizeActions } from "@web/common/hooks/useEventResizeActions";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { theme } from "@web/common/styles/theme";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { Resizable } from "@web/components/DND/Resizable";
import { TimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvent";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { useOpenEventContextMenu } from "@web/views/Day/hooks/events/useOpenEventContextMenu";
import {
  getAgendaEventPosition,
  getEventHeight,
} from "@web/views/Day/util/agenda/agenda.util";

export const DraggableTimedAgendaEvent = memo(
  ({
    event,
    bounds,
    interactions,
    isDraftEvent,
    isNewDraftEvent,
  }: {
    event: Schema_GridEvent;
    bounds: HTMLElement;
    interactions: UseInteractionsReturn;
    isDraftEvent: boolean;
    isNewDraftEvent: boolean;
  }) => {
    const openAgendaEventPreview = useOpenAgendaEventPreview();
    const openEventContextMenu = useOpenEventContextMenu();
    const nodeId = useFloatingNodeIdAtCursor();
    const eventFormOpen = nodeId === CursorItem.EventForm;
    const startDate = dayjs(event.startDate);
    const startPosition = getAgendaEventPosition(startDate.toDate());
    const height = getEventHeight(event);

    const { onResize, onResizeStart, onResizeStop } = useEventResizeActions(
      event as WithCompassId<Schema_Event>,
      bounds,
    );

    if (!event.startDate || !event.endDate || event.isAllDay) return null;

    return (
      <Draggable
        {...interactions?.getReferenceProps({
          onContextMenu: eventFormOpen ? undefined : openEventContextMenu,
          onFocus: eventFormOpen ? undefined : openAgendaEventPreview,
          onPointerEnter: eventFormOpen ? undefined : openAgendaEventPreview,
        })}
        dndProps={{
          id: event._id,
          data: {
            event: event,
            type: Categories_Event.TIMED,
            view: "day",
          },
        }}
        as="div"
        asChild
        className={classNames(
          CLASS_TIMED_CALENDAR_EVENT,
          "absolute cursor-move touch-none rounded focus:outline-none",
          "focus-visible:rounded focus-visible:ring-2",
          "focus:outline-none focus-visible:ring-yellow-200",
        )}
        style={{ top: startPosition, height }}
        tabIndex={0}
        role="button"
        data-draft-event={isDraftEvent}
        data-new-draft-event={isNewDraftEvent}
        data-event-id={event._id}
        aria-label={event.title || "Untitled event"}
      >
        <Resizable
          enable={{
            top: true,
            bottom: true,
            right: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          size={{ height }}
          minWidth="100%"
          maxWidth="100%"
          minHeight={SLOT_HEIGHT - 2}
          maxHeight={bounds.offsetHeight - parseInt(theme.spacing.m, 10)}
          className="rounded"
          onResizeStart={onResizeStart}
          onResizeStop={onResizeStop}
          onResize={onResize}
        >
          <TimedAgendaEvent event={event} height={height - 2} />
        </Resizable>
      </Draggable>
    );
  },
  fastDeepEqual,
);

DraggableTimedAgendaEvent.displayName = "DraggableTimedAgendaEvent";
