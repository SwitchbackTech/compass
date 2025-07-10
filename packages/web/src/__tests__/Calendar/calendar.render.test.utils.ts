import dayjs from "dayjs";
import { PreloadedState } from "redux";
import { Schema_Event } from "@core/types/event.types";
import { RootState } from "@web/store";

// Type for the initial state that can be passed to PreloadedState
export type InitialReduxState = PreloadedState<RootState>;

// Type for the simplified test state that matches our mock
type TestState = {
  events: {
    getSomedayEvents?: {
      value: {
        data: string[];
        count: number;
        pageSize: number;
        offset?: number;
        page?: number;
        [key: string]: unknown;
      } | null;
      isProcessing: boolean;
      isSuccess: boolean;
      error: unknown;
      reason: string | null;
    };
    getWeekEvents?: {
      value: {
        data: string[];
        count: number;
        pageSize: number;
        offset?: number;
        page?: number;
        [key: string]: unknown;
      } | null;
      isProcessing: boolean;
      isSuccess: boolean;
      error: unknown;
      reason: string | null;
    };
    entities?: {
      value: Record<string, unknown>;
    };
  };
};

// Helper to create initial state with sensible defaults
export const createInitialState = (
  partialState: Partial<RootState> = {},
): InitialReduxState => {
  const now = new Date();
  const oneWeekLater = new Date(now);
  oneWeekLater.setDate(now.getDate() + 7);

  return {
    events: {
      entities: { value: {} },
      getWeekEvents: {
        value: null,
        isProcessing: false,
        error: null,
        isSuccess: false,
        reason: null,
      },
      getSomedayEvents: {
        value: null,
        isProcessing: false,
        error: null,
        isSuccess: false,
        reason: null,
      },
      getCurrentMonthEvents: {
        value: null,
        isProcessing: false,
        error: null,
        isSuccess: false,
        reason: null,
      },
      createEvent: {
        isProcessing: false,
        error: null,
        value: null,
        isSuccess: false,
        reason: null,
      },
      editEvent: {
        isProcessing: false,
        error: null,
        value: null,
        isSuccess: false,
        reason: null,
      },
      deleteEvent: {
        isProcessing: false,
        error: null,
        value: null,
        isSuccess: false,
        reason: null,
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
    },
    view: {
      dates: {
        start: now.toISOString(),
        end: oneWeekLater.toISOString(),
      },
      sidebar: {
        tab: "tasks",
        isOpen: true,
      },
      header: {
        note: {
          focus: false,
        },
      },
    },
    settings: {
      isCmdPaletteOpen: false,
    },
    sync: {
      importLatest: {
        isFetchNeeded: false,
        reason: null,
      },
    },
    ...partialState,
  };
};

export const freshenEventStartEndDate = (event: Schema_Event): Schema_Event => {
  // Set event to start on the current week's Thursday at 11am and end at 12pm (timed event)
  const now = dayjs();
  const startOfWeek = now.startOf("week"); // Sunday
  const thursday = startOfWeek.add(4, "day"); // Thursday
  const newStartDate = thursday
    .hour(11)
    .minute(0)
    .second(0)
    .millisecond(0)
    .format();
  const newEndDate = thursday
    .hour(12)
    .minute(0)
    .second(0)
    .millisecond(0)
    .format();
  return { ...event, startDate: newStartDate, endDate: newEndDate };
};

export const findAndUpdateEventInPreloadedState = (
  preloadedState: TestState,
  eventId: string,
  callback: (event: Schema_Event) => Schema_Event,
): TestState => {
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  // Early return for invalid event ID
  if (!eventId) {
    throw new Error("Event ID is required");
  }

  // Safely access the events with proper null checks
  const events = preloadedState?.events?.entities?.value;
  if (!events) {
    throw new Error("Events state is not properly initialized");
  }

  const event = events[eventId];
  if (!event) {
    throw new Error(`Event with id ${eventId} not found`);
  }

  // Create a deep copy of the event to avoid mutations
  const eventCopy = JSON.parse(JSON.stringify(event));
  const updatedEvent = callback(eventCopy);

  // Return new state with updated event
  return {
    ...preloadedState,
    events: {
      ...preloadedState.events,
      entities: {
        ...preloadedState.events.entities,
        value: {
          ...events,
          [eventId]: updatedEvent,
        },
      },
    },
  };
};
