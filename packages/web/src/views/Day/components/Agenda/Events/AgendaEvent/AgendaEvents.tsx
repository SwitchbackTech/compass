import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { SLOT_HEIGHT } from "@web/views/Day/constants/day.constants";
import { getNowLinePosition } from "@web/views/Day/util/agenda/agenda.util";
import { EventContextMenuProvider } from "../../../ContextMenu/EventContextMenuContext";
import { AgendaSkeleton } from "../../AgendaSkeleton/AgendaSkeleton";
import { AgendaEvent } from "./AgendaEvent";

export const AgendaEvents = () => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const currentTime = new Date();

  return (
    <div className="relative ml-1 flex-1">
      <div
        data-testid="calendar-surface"
        style={{
          height: `${24 * 4 * SLOT_HEIGHT}px`,
          position: "relative",
        }}
      >
        {/* Current time indicator for events column */}
        <div
          className="border-red absolute right-0 left-0 z-30 border-t-2"
          style={{
            top: `${getNowLinePosition(currentTime)}px`,
          }}
        />

        {/* Event blocks */}
        <EventContextMenuProvider>
          <div className="relative">
            {isLoading ? (
              <AgendaSkeleton />
            ) : (
              events.map((event) => (
                <AgendaEvent key={event._id} event={event} />
              ))
            )}
          </div>
        </EventContextMenuProvider>
      </div>
    </div>
  );
};
