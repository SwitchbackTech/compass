import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

export const TimedAgendaEvent = memo(
  ({
    event,
    isDragging,
    listeners,
  }: {
    event: Schema_GridEvent;
    isDragging?: boolean;
    listeners?: SyntheticListenerMap;
  }) => {
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

    return (
      <div
        {...listeners}
        data-testid="agenda-event"
        className={classNames("flex items-center rounded px-2 text-xs", {
          "cursor-grabbing": isDragging,
          "text-text-light": isBackgroundDark,
          "text-text-dark": !isBackgroundDark,
        })}
        style={{
          height: `${renderedHeight}px`,
          backgroundColor: isPast
            ? darken(backgroundColor, 25)
            : backgroundColor,
        }}
      >
        <span className="flex-1 truncate">{event.title || "Untitled"}</span>
      </div>
    );
  },
  fastDeepEqual,
);

TimedAgendaEvent.displayName = "TimedAgendaEvent";
