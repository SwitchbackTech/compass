import classNames from "classnames";
import fastDeepEqual from "fast-deep-equal";
import { memo } from "react";
import { Over } from "@dnd-kit/core";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";

export const AgendaEvent = memo(
  ({
    event,
    canvasContext,
  }: {
    event: Schema_GridEvent;
    containerWidth: number;
    canvasContext: CanvasRenderingContext2D | null;
    over: Over | null;
    isDragging?: boolean;
  }) => {
    // Set canvas font to match 'text-xs' Tailwind class (0.75rem = 12px)
    if (canvasContext) {
      canvasContext.font = "0.75rem sans-serif";
    }

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
        className={classNames(
          "flex cursor-pointer items-center rounded px-2 text-xs",
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
