import { Schema_Event } from "@core/types/event.types";

export const AllDayAgendaEvent = ({ event }: { event: Schema_Event }) => {
  if (!event.title) return null;

  const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;

  return (
    <div
      className={`text-white-100 flex items-center rounded bg-blue-200 px-2 py-1 text-xs ${
        isPast ? "opacity-60" : ""
      }`}
      title={event.title}
    >
      <span className="flex-1 truncate">{event.title}</span>
    </div>
  );
};
