import classNames from "classnames";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { darken, isDark } from "@core/util/color.utils";
import { CLASS_TIMED_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getOverlappingStyles } from "@web/common/utils/overlap/overlap";
import { AgendaEventMenu } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger";
import { useEventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

export const AgendaEvent = ({
  event,
  containerWidth,
  canvasContext,
}: {
  event: Schema_GridEvent;
  containerWidth: number;
  canvasContext: CanvasRenderingContext2D | null;
}) => {
  const { openContextMenu } = useEventContextMenu();

  if (!event.startDate || !event.endDate) return null;

  // Set canvas font to match 'text-xs' Tailwind class (0.75rem = 12px)
  if (canvasContext) {
    canvasContext.font = "0.75rem sans-serif";
  }

  const textMeasure = canvasContext?.measureText(event.title ?? "");
  const textWidth = textMeasure?.width ?? 0;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const startPosition = getAgendaEventPosition(startDate);
  const endPosition = getAgendaEventPosition(endDate);
  const blockHeight = endPosition - startPosition;
  const GAP_PX = 2;
  const renderedHeight = Math.max(4, blockHeight - GAP_PX);

  const isPast = endDate < new Date();
  const priority = event.priority || Priorities.UNASSIGNED;
  const backgroundColor = colorByPriority[priority];
  const isBackgroundDark = isDark(backgroundColor);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    openContextMenu(event as Schema_Event, { x: e.clientX, y: e.clientY });
  };

  const overlappingStyles = getOverlappingStyles(
    event,
    containerWidth,
    textWidth,
  );

  return (
    <AgendaEventMenu>
      <AgendaEventMenuTrigger asChild>
        <div
          className={classNames(
            CLASS_TIMED_CALENDAR_EVENT,
            "absolute flex cursor-pointer items-center rounded px-2 text-xs",
            "focus:ring-2 focus:ring-yellow-200 focus:outline-none",
            {
              "text-text-light": isBackgroundDark,
              "text-text-dark": !isBackgroundDark,
              "border-border-transparent border": event.position.isOverlapping,
              "shadow-md hover:!z-40 focus:!z-40": event.position.isOverlapping,
            },
          )}
          style={{
            height: `${renderedHeight}px`,
            top: `${startPosition}px`,
            backgroundColor: isPast
              ? darken(backgroundColor, 25)
              : backgroundColor,
            ...overlappingStyles,
          }}
          tabIndex={0}
          role="button"
          data-event-id={event._id}
          aria-label={event.title || "Untitled event"}
          onContextMenu={handleContextMenu}
        >
          <span className="flex-1 truncate">{event.title || "Untitled"}</span>
        </div>
      </AgendaEventMenuTrigger>
      <AgendaEventMenuContent event={event as Schema_Event} />
    </AgendaEventMenu>
  );
};
