import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { UseInteractionsReturn } from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";
import { CLASS_TIMED_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { Resizable } from "@web/components/DND/Resizable";
import { TimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvent";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { useOpenEventContextMenu } from "@web/views/Day/hooks/events/useOpenEventContextMenu";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

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
    const maxZIndex = useGridMaxZIndex();

    if (!event.startDate || !event.endDate || event.isAllDay) return null;

    const startDate = new Date(event.startDate);
    const startPosition = getAgendaEventPosition(startDate);

    return (
      <Draggable
        {...interactions?.getReferenceProps({
          onContextMenu: isNewDraftEvent ? undefined : openEventContextMenu,
          onFocus: isNewDraftEvent ? undefined : openAgendaEventPreview,
          onPointerEnter: isNewDraftEvent ? undefined : openAgendaEventPreview,
        })}
        dndProps={{
          id: event._id,
          data: {
            event,
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
        style={{
          top: `${startPosition}px`,
          zIndex: isDraftEvent ? maxZIndex + 3 : undefined,
        }}
        tabIndex={0}
        role="button"
        data-draft-event={isDraftEvent}
        data-new-draft-event={isNewDraftEvent}
        data-event-id={event._id}
        aria-label={event.title || "Untitled event"}
      >
        <Resizable
          enable={{
            top: false, // all handles temporary disables until full implementation
            bottom: false,
            right: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          minHeight={SLOT_HEIGHT}
          minWidth="100%"
          maxWidth="100%"
          defaultSize={{ width: "100%" }}
          bounds={bounds}
        >
          <TimedAgendaEvent event={event} />
        </Resizable>
      </Draggable>
    );
  },
  fastDeepEqual,
);

DraggableTimedAgendaEvent.displayName = "DraggableTimedAgendaEvent";
