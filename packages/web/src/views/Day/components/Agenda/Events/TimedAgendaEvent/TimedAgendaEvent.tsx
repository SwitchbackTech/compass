import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { theme } from "@web/common/styles/theme";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { DNDChildProps } from "@web/components/DND/Draggable";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
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
    const { timedEventsGridRef, nowLineRef } = useCompassRefs();
    const { listeners, isDragging, over } = dndProps ?? {};
    const renderedHeight = height ?? getEventHeight(event);
    const isPast = new Date(event.endDate) < new Date();
    const priority = event.priority || Priorities.UNASSIGNED;
    const priorityColor = colorByPriority[priority];
    const backgroundColor = isPast ? darken(priorityColor, 25) : priorityColor;
    const isBackgroundDark = isDark(priorityColor);
    const nowLineWidth = nowLineRef?.current?.offsetWidth ?? 0;
    const mainGridWidth = timedEventsGridRef?.current?.offsetWidth ?? 0;
    const isOverAllDayGrid = over?.id === ID_GRID_ALLDAY_ROW;
    const allDayGridHeight = SLOT_HEIGHT + parseInt(theme.spacing.xs, 10);
    const isDraggingOverAllDayGrid = isDragging && isOverAllDayGrid;

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
          height: isDraggingOverAllDayGrid ? allDayGridHeight : renderedHeight,
          backgroundColor,
          ...(isDraggingOverAllDayGrid
            ? {
                width:
                  mainGridWidth + nowLineWidth - parseInt(theme.spacing.s, 10),
                marginLeft: -nowLineWidth,
              }
            : {}),
        }}
      >
        <span className="flex-1 truncate">{event.title || "Untitled"}</span>
      </div>
    );
  },
  fastDeepEqual,
);

TimedAgendaEvent.displayName = "TimedAgendaEvent";
