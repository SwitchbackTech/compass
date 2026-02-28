import { PreloadedState, configureStore } from "@reduxjs/toolkit";
import { Schema_Event } from "@core/types/event.types";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { RootState } from "@web/store";
import { reducers } from "@web/store/reducers";

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
    getDayEvents?: {
      value: null;
      isProcessing: boolean;
      isSuccess: boolean;
      error: unknown;
      reason: string | null;
    };
    entities?: {
      value: Record<string, unknown>;
    };
    [key: string]: unknown;
  };
};
// Type for the initial state that can be passed to PreloadedState
export type InitialReduxState = PreloadedState<RootState>;

// Helper to create initial state with sensible defaults
export const createInitialState = (
  partialState: Partial<RootState> = {},
): InitialReduxState => {
  const now = new Date();
  const oneWeekLater = new Date(now);
  oneWeekLater.setDate(now.getDate() + 7);

  return {
    auth: {
      status: "idle",
      error: null,
    },
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
      getDayEvents: {
        value: null,
        isProcessing: false,
        error: null,
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
      pendingEvents: {
        eventIds: [],
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
        reminder: "",
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
        isImportPending: false,
        importError: null,
      },
      importLatest: {
        isFetchNeeded: false,
        reason: null,
      },
    },
    ...partialState,
  };
};

export const createStoreWithEvents = (
  events: Schema_Event[],
  options: { isProcessing?: boolean } = {},
) => {
  const preloadedState = createInitialState();
  const entities = events.reduce<Record<string, Schema_Event>>((acc, event) => {
    if (event._id) {
      acc[event._id] = event;
    }
    return acc;
  }, {});

  preloadedState.events.entities!.value = entities;
  preloadedState.events.getDayEvents = {
    value: {
      data: events
        .filter((event) => Boolean(event._id))
        .map((event) => event._id as string),
      count: events.length,
      pageSize: events.length || 1,
      page: 1,
      offset: 0,
    },
    isProcessing: options.isProcessing ?? false,
    isSuccess: !options.isProcessing,
    error: null,
    reason: null,
  };

  return configureStore({
    reducer: reducers,
    preloadedState: preloadedState as PreloadedState<RootState>,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      }).concat(sagaMiddleware),
  });
};

export const findAndUpdateEventInPreloadedState = (
  preloadedState: TestState,
  eventId: string,
  callback: (event: Schema_Event) => Schema_Event,
): TestState => {
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
