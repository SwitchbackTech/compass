import dayjs from "dayjs";
import { PreloadedState } from "redux";
import { Schema_Event } from "@core/types/event.types";

export const freshenEventStartEndDate = (event: Schema_Event): Schema_Event => {
  const newStartDate = dayjs(new Date()).add(1, "day").format();
  const newEndDate = dayjs(new Date()).add(3, "day").format();
  return { ...event, startDate: newStartDate, endDate: newEndDate };
};

export const findAndUpdateEventInPreloadedState = (
  preloadedState: ReturnType<PreloadedState>,
  eventId: string,
  callback: (event: Schema_Event) => Schema_Event,
) => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  const event = preloadedState.events.entities.value[eventId];
  if (!event) {
    throw new Error(`Event with id ${eventId} not found`);
  }

  const newPreloadedState = {
    ...preloadedState,
    events: {
      ...preloadedState.events,
      entities: {
        ...preloadedState.events.entities,
        value: {
          ...preloadedState.events.entities.value,
          [eventId]: callback(event),
        },
      },
    },
  };

  return newPreloadedState;
};
