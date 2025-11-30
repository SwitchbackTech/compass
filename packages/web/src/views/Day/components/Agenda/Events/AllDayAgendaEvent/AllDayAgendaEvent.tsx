import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { darken, isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { AgendaEventMenu } from "../AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "../AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "../AgendaEventMenu/AgendaEventMenuTrigger";

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
          className={`flex items-center rounded px-2 py-1 text-xs last:mb-8 focus:ring-2 focus:ring-yellow-200 focus:outline-none ${
            shouldUseLightText ? "text-text-lighter" : "text-text-dark"
          } ${isPast ? "opacity-60" : ""}`}
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
