import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { isDark } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import { getAgendaEventPosition } from "@web/views/Day/util/agenda/agenda.util";
import { AgendaEventMenu } from "../AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "../AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "../AgendaEventMenu/AgendaEventMenuTrigger";

export const AgendaEvent = ({ event }: { event: Schema_Event }) => {
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

  return (
    <AgendaEventMenu>
      <AgendaEventMenuTrigger asChild>
        <div
          className={`absolute right-2 left-2 flex items-center rounded px-2 text-xs focus:ring-2 focus:ring-yellow-200 focus:outline-none ${
            isBackgroundDark ? "text-white" : "text-gray-900"
          } ${isPast ? "opacity-60" : ""}`}
          style={{
            height: `${renderedHeight}px`,
            top: `${startPosition}px`,
            backgroundColor,
          }}
          tabIndex={0}
          role="button"
          data-event-id={event._id}
        >
          <span className="flex-1 truncate">{event.title || "Untitled"}</span>
        </div>
      </AgendaEventMenuTrigger>
      <AgendaEventMenuContent event={event} />
    </AgendaEventMenu>
  );
};
