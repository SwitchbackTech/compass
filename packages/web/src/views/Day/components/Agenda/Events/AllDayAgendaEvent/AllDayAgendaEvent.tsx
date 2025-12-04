import classNames from "classnames";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { darken, isDark } from "@core/util/color.utils";
import { CLASS_ALL_DAY_CALENDAR_EVENT } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { AgendaEventMenu } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "@web/views/Day/components/Agenda/Events/AgendaEventMenu/AgendaEventMenuTrigger";

export const AllDayAgendaEvent = ({ event }: { event: Schema_Event }) => {
  if (!event.title) return null;

  const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;

  const priority = event.priority || Priorities.UNASSIGNED;
  const priorityColor = colorByPriority[priority];
  const backgroundColor = priorityColor;
  const darkPriorityColor = darken(priorityColor);
  const shouldUseLightText = isDark(darkPriorityColor);

  return (
    <AgendaEventMenu>
      <AgendaEventMenuTrigger asChild>
        <div
          className={classNames(
            CLASS_ALL_DAY_CALENDAR_EVENT,
            "cursor-pointer",
            "flex items-center rounded px-2 py-1 text-xs last:mb-8",
            "focus:ring-2 focus:ring-yellow-200 focus:outline-none",
            {
              "opacity-60": isPast,
              "text-text-lighter": shouldUseLightText,
              "text-text-dark": !shouldUseLightText,
            },
          )}
          style={{ backgroundColor }}
          title={event.title}
          tabIndex={0}
          role="button"
          aria-label={event.title || "Untitled event"}
          data-event-id={event._id}
        >
          <span className="flex-1 truncate">{event.title}</span>
        </div>
      </AgendaEventMenuTrigger>
      <AgendaEventMenuContent event={event} />
    </AgendaEventMenu>
  );
};
