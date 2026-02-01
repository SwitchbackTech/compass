import {
  CHILL_ALL_DAY,
  CLIMB,
  EUROPE_TRIP,
  GROCERIES,
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/v1/events/events.misc";
import { InitialReduxState } from "@web/__tests__/utils/state/store.test.util";
import { AuthStatus } from "@web/ducks/auth/slices/auth.slice";

export const preloadedState: InitialReduxState = {
  auth: {
    status: "idle",
    error: null,
  },
  events: {
    getSomedayEvents: {
      value: {
        data: [EUROPE_TRIP._id as string],
        count: 1,
        pageSize: 10,
      },
      isProcessing: false,
      isSuccess: true,
      error: null,
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
        count: 6,
        pageSize: 10,
      },
      isProcessing: false,
      isSuccess: true,
      error: null,
      reason: null,
    },
    getDayEvents: {
      value: null,
      isProcessing: false,
      isSuccess: true,
      error: null,
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
    draft: {
      event: null,
      status: {
        activity: null,
        isDrafting: false,
        eventType: null,
        dateToResize: null,
      },
    },
    pendingEvents: {
      eventIds: [],
    },
  },
  settings: {
    isCmdPaletteOpen: false,
  },
  sync: {
    importGCal: {
      importing: false,
      importResults: null,
      pendingLocalEventsSynced: null,
    },
    importLatest: {
      isFetchNeeded: false,
      reason: null,
    },
  },
  view: {
    dates: {
      start: "2025-12-07T00:00:00Z",
      end: "2025-12-13T23:59:59Z",
    },
    sidebar: {
      tab: "tasks",
      isOpen: true,
    },
    header: {
      reminder: "",
    },
  },
};
