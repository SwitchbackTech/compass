import { Priorities } from "@core/constants/core.constants";
import { isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";
import { theme } from "../../../../../../common/styles/theme";
import { useEventContextMenu } from "../../../ContextMenu/EventContextMenuContext";
import { AgendaEventMenu } from "../AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "../AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "../AgendaEventMenu/AgendaEventMenuTrigger";

export const AgendaEvent = ({ event }: { event: Schema_GridEvent }) => {
  const { openContextMenu } = useEventContextMenu();

  if (!event.startDate || !event.endDate) return null;

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
    openContextMenu(event, { x: e.clientX, y: e.clientY });
  };

  // Calculate styles for overlapping events
  const getOverlappingStyles = () => {
    if (!event.position.isOverlapping) {
      return {
        left: "0.5rem", // 2 in Tailwind
        right: "0.5rem", // 2 in Tailwind
        width: "auto",
        zIndex: 1,
      };
    }

    // Get the total number of overlapping events from the position
    // The widthMultiplier represents 1/n where n is the number of overlapping events
    const totalOverlapping = Math.round(1 / event.position.widthMultiplier);
    const order = event.position.horizontalOrder;

    // When there are less than 3 overlapping events, use equal widths
    if (totalOverlapping < 3) {
      const widthPercent = 100 / totalOverlapping;
      const leftPercent = widthPercent * (order - 1);

      return {
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - ${theme.spacing.s})`,
        right: "auto",
        zIndex: order,
      };
    }

    // When there are 3 or more overlapping events, use varying widths
    // Each subsequent event gets narrower and higher z-index
    const widthPercent = 100 - (order - 1) * 3;

    // Stack events with slight offset for visibility
    const leftOffset = (order - 1) * 8; // 8px offset per event - theme.spacing.s

    return {
      left: `${leftOffset}px`,
      width: `calc(${widthPercent}% - ${leftOffset}px - 0.5rem)`,
      right: `${leftOffset}px`,
      zIndex: order,
    };
  };

  const overlappingStyles = getOverlappingStyles();

  // Build className based on event properties
  const getEventClassName = () => {
    const baseClasses =
      "absolute flex items-center rounded px-2 text-xs focus:ring-2 focus:ring-yellow-200 focus:outline-none";
    const textColorClass = isBackgroundDark
      ? "text-text-light"
      : "text-text-dark";
    const opacityClass = isPast ? "opacity-60" : "";
    const borderClass = event.position.isOverlapping
      ? "border border-border-primary"
      : "";

    return `${baseClasses} ${textColorClass} ${opacityClass} ${borderClass}`.trim();
  };

  return (
    <AgendaEventMenu>
      <AgendaEventMenuTrigger asChild>
        <div
          className={getEventClassName()}
          style={{
            height: `${renderedHeight}px`,
            top: `${startPosition}px`,
            backgroundColor,
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
      <AgendaEventMenuContent event={event} />
    </AgendaEventMenu>
  );
};
