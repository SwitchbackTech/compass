import {
  CHILL_ALL_DAY,
  EUROPE_TRIP,
  GROCERIES,
} from "@core/__mocks__/events/events.misc";

export const weekEventState = {
  events: {
    getFutureEvents: {
      value: {
        data: [EUROPE_TRIP._id],
      },
    },
    getWeekEvents: {
      value: {
        data: [GROCERIES._id, CHILL_ALL_DAY._id],
      },
    },
    entities: {
      value: {
        [EUROPE_TRIP._id]: EUROPE_TRIP,
        [GROCERIES._id]: GROCERIES,
        [CHILL_ALL_DAY._id]: CHILL_ALL_DAY,
      },
    },
  },
};
