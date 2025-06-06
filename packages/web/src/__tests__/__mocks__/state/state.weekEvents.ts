import {
  CHILL_ALL_DAY,
  CLIMB,
  EUROPE_TRIP,
  GROCERIES,
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/v1/events/events.misc";
import { InitialReduxState } from "@web/__tests__/Calendar/calendar.render.test.utils";

export const preloadedState: InitialReduxState = {
  events: {
    getSomedayEvents: {
      value: {
        data: [EUROPE_TRIP._id as string],
        count: 0,
        pageSize: 0,
      },
      isProcessing: false,
      isSuccess: false,
      error: undefined,
      reason: null,
    },
    getWeekEvents: {
      value: {
        data: [
          CLIMB._id as string,
          CHILL_ALL_DAY._id as string,
          GROCERIES._id as string,
          MARCH_1._id as string,
          MULTI_WEEK._id as string,
          TY_TIM._id as string,
        ],
        count: 0,
        pageSize: 0,
      },
      isProcessing: false,
      isSuccess: false,
      error: undefined,
      reason: null,
    },
    entities: {
      value: {
        [CLIMB._id as string]: CLIMB,
        [CHILL_ALL_DAY._id as string]: CHILL_ALL_DAY,
        [EUROPE_TRIP._id as string]: EUROPE_TRIP,
        [GROCERIES._id as string]: GROCERIES,
        [MARCH_1._id as string]: MARCH_1,
        [MULTI_WEEK._id as string]: MULTI_WEEK,
        [TY_TIM._id as string]: TY_TIM,
      },
    },
  },
  settings: {
    isCmdPaletteOpen: false,
  },
  sync: {
    isFetchNeeded: false,
    reason: null,
  },
  view: {
    dates: {
      start: "",
      end: "",
    },
    sidebar: {
      tab: "tasks",
      isOpen: true,
    },
  },
};
