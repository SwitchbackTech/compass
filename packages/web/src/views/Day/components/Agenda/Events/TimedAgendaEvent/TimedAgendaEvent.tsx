import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { DNDChildProps } from "@web/components/DND/Draggable";
import { getEventHeight } from "@web/views/Day/util/agenda/agenda.util";

export const TimedAgendaEvent = memo(
  ({
    event,
    dndProps,
    height,
  }: {
    height?: number;
    event: Schema_GridEvent;
    dndProps?: DNDChildProps;
  }) => {
    const { listeners, isDragging } = dndProps ?? {};
    const renderedHeight = height ?? getEventHeight(event);
    const isPast = new Date(event.endDate) < new Date();
    const priority = event.priority || Priorities.UNASSIGNED;
    const backgroundColor = colorByPriority[priority];
    const isBackgroundDark = isDark(backgroundColor);

    return (
      <div
        {...listeners}
        data-testid="agenda-event"
        className={classNames("flex flex-1 items-center rounded px-2 text-xs", {
          "cursor-grabbing border": isDragging,
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
