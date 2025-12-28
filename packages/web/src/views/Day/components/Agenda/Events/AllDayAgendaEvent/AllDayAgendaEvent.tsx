import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal/react";
import { memo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { useCompassRefs } from "@web/common/hooks/useCompassRefs";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { DNDChildProps } from "@web/components/DND/Draggable";

export const AllDayAgendaEvent = memo(
  ({
    event,
    dndProps,
  }: {
    event: Schema_GridEvent;
    dndProps?: DNDChildProps;
  }) => {
    const { nowLineRef } = useCompassRefs();
    const { isDragging, over } = dndProps ?? {};
    const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;
    const priority = event.priority || Priorities.UNASSIGNED;
    const priorityColor = colorByPriority[priority];
    const backgroundColor = priorityColor;
    const darkPriorityColor = darken(priorityColor);
    const shouldUseLightText = isDark(darkPriorityColor);
    const isOverMainGrid = over?.id === ID_GRID_MAIN;
    const nowLineWidth = nowLineRef?.current?.offsetWidth ?? 0;
    const borderRingSpace = 2;

    return (
      <div
        className={classNames(
          "flex flex-1 items-center rounded px-2 py-1 text-xs",
          {
            "cursor-grabbing": isDragging,
            "opacity-60": isPast && !isDragging,
            "text-text-lighter": shouldUseLightText,
            "text-text-dark": !shouldUseLightText,
          },
        )}
        style={{
          backgroundColor,
          ...(isDragging && isOverMainGrid
            ? {
                marginLeft: nowLineWidth - borderRingSpace,
                marginRight: borderRingSpace,
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

AllDayAgendaEvent.displayName = "AllDayAgendaEvent";
