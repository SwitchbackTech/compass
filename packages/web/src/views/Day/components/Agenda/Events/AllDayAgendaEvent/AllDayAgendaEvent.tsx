import { Schema_Event } from "@core/types/event.types";
import { AgendaEventMenu } from "../AgendaEventMenu/AgendaEventMenu";
import { AgendaEventMenuContent } from "../AgendaEventMenu/AgendaEventMenuContent";
import { AgendaEventMenuTrigger } from "../AgendaEventMenu/AgendaEventMenuTrigger";

export const AllDayAgendaEvent = ({ event }: { event: Schema_Event }) => {
  if (!event.title) return null;

  const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;

  return (
    <AgendaEventMenu>
      <AgendaEventMenuTrigger asChild>
        <div
          className={`text-white-100 flex items-center rounded bg-blue-200 px-2 py-1 text-xs focus:ring-2 focus:ring-yellow-200 focus:outline-none ${
            isPast ? "opacity-60" : ""
          }`}
          title={event.title}
          tabIndex={0}
          role="button"
          data-event-id={event._id}
        >
          <span className="flex-1 truncate">{event.title}</span>
        </div>
      </AgendaEventMenuTrigger>
      <AgendaEventMenuContent event={event} />
    </AgendaEventMenu>
  );
};
