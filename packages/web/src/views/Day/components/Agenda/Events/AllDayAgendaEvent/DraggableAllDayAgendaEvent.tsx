import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { UseInteractionsReturn } from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";
import { CLASS_ALL_DAY_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Draggable } from "@web/components/DND/Draggable";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { useOpenEventContextMenu } from "@web/views/Day/hooks/events/useOpenEventContextMenu";

export const DraggableAllDayAgendaEvent = memo(
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
    const openAgendaEventPreview = useOpenAgendaEventPreview();
    const openEventContextMenu = useOpenEventContextMenu();
    const maxZIndex = useGridMaxZIndex();

    if (!event.startDate || !event.endDate || !event.isAllDay) return null;

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
        style={{
          zIndex: isDraftEvent ? maxZIndex + 3 : undefined,
        }}
        title={event.title}
        tabIndex={0}
        role="button"
        aria-label={event.title || "Untitled event"}
        data-draft-event={isDraftEvent}
        data-new-draft-event={isNewDraftEvent}
        data-event-id={event._id}
      >
        <AllDayAgendaEvent event={event} />
      </Draggable>
    );
  },
  fastDeepEqual,
);

DraggableAllDayAgendaEvent.displayName = "DraggableAllDayAgendaEvent";
