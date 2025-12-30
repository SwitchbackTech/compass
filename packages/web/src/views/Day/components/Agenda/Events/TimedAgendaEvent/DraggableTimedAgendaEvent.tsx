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
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { useEventResizeActions } from "@web/common/hooks/useEventResizeActions";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { useIsDraggingEvent } from "@web/common/hooks/useIsDraggingEvent";
import { useMainGridSelectionId } from "@web/common/hooks/useMainGridSelectionId";
import { useMainGridSelectionState } from "@web/common/hooks/useMainGridSelectionState";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { useResizeId } from "@web/common/hooks/useResizeId";
import { useResizing } from "@web/common/hooks/useResizing";
import { theme } from "@web/common/styles/theme";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  getEventCursorClass,
  isOptimisticEvent,
} from "@web/common/utils/event/event.util";
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
    interactions,
    isDraftEvent,
    isNewDraftEvent,
  }: {
    event: Schema_GridEvent;
    interactions: UseInteractionsReturn;
    isDraftEvent: boolean;
    isNewDraftEvent: boolean;
  }) => {
    const { timedEventsGridRef } = useCompassRefs();
    const openAgendaEventPreview = useOpenAgendaEventPreview();
    const openEventContextMenu = useOpenEventContextMenu();
    const nodeId = useFloatingNodeIdAtCursor();
    const maxZIndex = useGridMaxZIndex();
    const mainGrid = timedEventsGridRef.current;
    const eventFormOpen = nodeId === CursorItem.EventForm;
    const startDate = dayjs(event.startDate);
    const startPosition = getAgendaEventPosition(startDate.toDate());
    const height = getEventHeight(event);
    const { selecting } = useMainGridSelectionState();
    const resizing = useResizing();
    const resizeId = useResizeId();
    const dragging = useIsDraggingEvent();
    const selectionId = useMainGridSelectionId();
    const isBeingSelected = selectionId === event._id;
    const isBeingResized = resizeId === event._id;
    const enableInteractions = !resizing && !selecting && !eventFormOpen;
    const mainGridHeight = mainGrid?.offsetHeight ?? 0;
    const { _id, endDate, isAllDay } = event;

    const { onResize, onResizeStart, onResizeStop } = useEventResizeActions(
      event as WithCompassId<Schema_Event>,
    );

    const isOptimistic = isOptimisticEvent(event as Schema_Event);
    const cursorClass = getEventCursorClass(dragging, isOptimistic);

    if (!_id || !event.startDate || !endDate || isAllDay) return null;

    return (
      <Draggable
        {...interactions?.getReferenceProps({
          onContextMenu: enableInteractions ? openEventContextMenu : undefined,
          onFocus: enableInteractions ? openAgendaEventPreview : undefined,
          onPointerEnter: enableInteractions
            ? openAgendaEventPreview
            : undefined,
        })}
        dndProps={{
          id: _id,
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
          "absolute touch-none rounded focus:outline-none",
          "focus-visible:rounded focus-visible:ring-2",
          "focus:outline-none focus-visible:ring-yellow-200",
          cursorClass,
          { "pointer-events-none": isBeingSelected },
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
          id={event._id!}
          enable={{
            top: !dragging,
            bottom: !dragging,
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
          maxHeight={mainGridHeight - parseInt(theme.spacing.m, 10)}
          style={
            isBeingResized || isBeingSelected ? { zIndex: maxZIndex + 2 } : {}
          }
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
