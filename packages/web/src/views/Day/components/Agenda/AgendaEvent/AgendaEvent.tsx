import { Schema_Event } from "@core/types/event.types";
import {
  getAgendaEventPosition,
  getAgendaEventTitle,
} from "@web/views/Day/util/agenda/agenda.util";

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

  return (
    <div
      key={event._id}
      className={`text-white-100 absolute right-2 left-2 flex items-center rounded bg-blue-200 px-2 text-xs ${
        isPast ? "opacity-60" : ""
      }`}
      style={{
        height: `${renderedHeight}px`,
        top: `${startPosition}px`,
      }}
      title={getAgendaEventTitle(event)}
    >
      <span className="flex-1 truncate">{event.title || "Untitled"}</span>
    </div>
  );
};
