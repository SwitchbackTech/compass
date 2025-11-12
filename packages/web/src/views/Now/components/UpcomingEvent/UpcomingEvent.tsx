import { useUpcomingEvent } from "@web/views/Now/hooks/useUpcomingEvent";

export function UpcomingEvent() {
  const { event, starts } = useUpcomingEvent();

  return (
    <div className="absolute top-6 right-6 z-10">
      <div className="flex min-w-[220px] flex-col gap-4 rounded-lg border border-[#4a4a4a] bg-[#2a2a2a] p-4 shadow-lg">
        <div className="text-sm leading-tight font-medium text-white">
          {event?.title ?? " No more events today. Lock in"}
        </div>
        {starts ? (
          <div className="text-xs font-medium text-blue-400">
            starts {starts}
          </div>
        ) : null}
      </div>
    </div>
  );
}
