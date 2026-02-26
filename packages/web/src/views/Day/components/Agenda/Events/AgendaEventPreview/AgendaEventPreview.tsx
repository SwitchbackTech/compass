import { useMemo } from "react";
import { useDndContext } from "@dnd-kit/core";
import {
  FloatingPortal,
  UseInteractionsReturn,
  useFloating,
} from "@floating-ui/react";
import { useObservable } from "@ngneat/use-observable";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { ZIndex } from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { colorByPriority } from "@web/common/styles/theme.util";
import { activeEvent$, draft$ } from "@web/store/events";
import { getAgendaEventTime } from "@web/views/Day/util/agenda/agenda.util";

export function AgendaEventPreview({
  floating,
  interactions,
}: {
  floating: ReturnType<typeof useFloating>;
  interactions: UseInteractionsReturn;
}) {
  const [activeEvent] = useObservable(activeEvent$);
  const [draft] = useObservable(draft$);

  const useDraft = useMemo(
    () => !!draft?._id && draft?._id === activeEvent?._id,
    [draft?._id, activeEvent?._id],
  );

  const event = useDraft ? draft : activeEvent;
  const { activeNode } = useDndContext();
  const nodeId = useFloatingNodeIdAtCursor();
  const floatingContextOpen = floating.context.open;
  const maxZIndex = useGridMaxZIndex();
  const isOpenAtCursor = nodeId === CursorItem.EventPreview;
  const open = floatingContextOpen && isOpenAtCursor && !!event;
  const priority = event?.priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];
  const darkPriorityColor = darken(priorityColor);
  const shouldUseLightText = isDark(darkPriorityColor);
  const floatingNode = floating.refs.domReference.current;
  const isDragging = activeNode?.isEqualNode(floatingNode);

  const timeDisplay =
    !event?.isAllDay && event?.startDate && event?.endDate
      ? `${getAgendaEventTime(event.startDate)} - ${getAgendaEventTime(event.endDate)}`
      : "";

  if (!open || isDragging) return null;

  return (
    <FloatingPortal>
      <div
        {...interactions.getFloatingProps()}
        ref={floating.refs.setFloating}
        role="dialog"
        aria-labelledby="event-title"
        aria-describedby={event?.description ? "event-description" : undefined}
        className={`z-${ZIndex.LAYER_5} max-w-80 min-w-64 rounded-lg p-4 shadow-lg`}
        style={{
          ...floating.context.floatingStyles,
          backgroundColor: darkPriorityColor,
          zIndex: maxZIndex + 1,
        }}
      >
        <div className="space-y-2">
          <h3
            id="event-title"
            className={`text-sm font-semibold ${
              shouldUseLightText ? "text-text-lighter" : "text-text-dark"
            }`}
          >
            {event?.title || "Untitled Event"}
          </h3>
          {timeDisplay && (
            <time
              className={`text-xs font-medium ${
                shouldUseLightText ? "text-text-lighter/90" : "text-text-dark"
              }`}
              dateTime={event?.startDate}
            >
              {timeDisplay}
            </time>
          )}
          {event?.description && (
            <p
              id="event-description"
              className={`text-xs leading-relaxed ${
                shouldUseLightText ? "text-text-lighter/85" : "text-text-dark"
              }`}
            >
              {event?.description}
            </p>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
}
