import {
  CHILL_ALL_DAY,
  CLIMB,
  EUROPE_TRIP,
  GROCERIES,
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/events/events.misc";

export const preloadedState = {
  events: {
    getSomedayEvents: {
      value: {
        data: [EUROPE_TRIP._id],
      },
    },
    getWeekEvents: {
      value: {
        data: [
          CLIMB._id,
          CHILL_ALL_DAY._id,
          GROCERIES._id,
          MARCH_1._id,
          MULTI_WEEK._id,
          TY_TIM._id,
        ],
      },
    },
    entities: {
      value: {
        [CLIMB._id]: CLIMB,
        [CHILL_ALL_DAY._id]: CHILL_ALL_DAY,
        [EUROPE_TRIP._id]: EUROPE_TRIP,
        [GROCERIES._id]: GROCERIES,
        [MARCH_1._id]: MARCH_1,
        [MULTI_WEEK._id]: MULTI_WEEK,
        [TY_TIM._id]: TY_TIM,
      },
    },
  },
};
