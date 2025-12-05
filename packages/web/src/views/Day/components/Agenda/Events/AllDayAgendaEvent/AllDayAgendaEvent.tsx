import classNames from "classnames";
import { Priorities } from "@core/constants/core.constants";
import { darken, isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export const AllDayAgendaEvent = ({ event }: { event: Schema_GridEvent }) => {
  const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;
  const priority = event.priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];
  const backgroundColor = priorityColor;
  const darkPriorityColor = darken(priorityColor);
  const shouldUseLightText = isDark(darkPriorityColor);

  return (
    <div
      className={classNames(
        "cursor-pointer",
        "flex items-center rounded px-2 py-1 text-xs",
        "focus:ring-2 focus:ring-yellow-200 focus:outline-none",
        {
          "opacity-60": isPast,
          "text-text-lighter": shouldUseLightText,
          "text-text-dark": !shouldUseLightText,
        },
      )}
      style={{ backgroundColor }}
    >
      <span className="flex-1 truncate">{event.title}</span>
    </div>
  );
};
