import { type Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  clearAuthenticationState,
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  updateAuthState,
} from "@web/auth/compass/state/auth.state.util";
import { type ApiResponse } from "@web/common/apis/api.types";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import {
  type Schema_GridEvent,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const mockDoesSessionExist = mock();
const mockEventApiCreate = mock();
const mockEventApiDelete = mock();
const mockEventApiEdit = mock();
const mockEventApiGet = mock();
const mockEventApiReorder = mock();
const mockAlert = mock();

mock.module("@web/ducks/events/event.api", () => ({
  EventApi: {
    create: mockEventApiCreate,
    delete: mockEventApiDelete,
    edit: mockEventApiEdit,
    get: mockEventApiGet,
    reorder: mockEventApiReorder,
  },
}));

mock.module("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist: mockDoesSessionExist,
  },
}));

const { createStoreWithEvents } = await import(
  "@web/__tests__/utils/state/store.test.util"
);
const { sagaMiddleware } = await import("@web/common/store/middlewares");
const { selectEventById } = await import(
  "@web/ducks/events/selectors/event.selectors"
);
const { selectIsEventPending } = await import(
  "@web/ducks/events/selectors/pending.selectors"
);
const { createEventSlice, editEventSlice } = await import(
  "@web/ducks/events/slices/event.slice"
);
const { sagas } = await import("@web/store/sagas");
const { OnSubmitParser } = await import(
  "@web/views/Calendar/components/Draft/hooks/actions/submit.parser"
);

global.alert = mockAlert as typeof global.alert;

const clearApiMocks = () => {
  mockDoesSessionExist.mockClear();
  mockEventApiCreate.mockClear();
  mockEventApiDelete.mockClear();
  mockEventApiEdit.mockClear();
  mockEventApiGet.mockClear();
  mockEventApiReorder.mockClear();
  mockAlert.mockClear();
};

let consoleSpies: Array<{ mockRestore: () => void }> = [];

beforeEach(() => {
  consoleSpies = [
    spyOn(console, "log").mockImplementation(() => {}),
    spyOn(console, "warn").mockImplementation(() => {}),
    spyOn(console, "error").mockImplementation(() => {}),
    spyOn(console, "info").mockImplementation(() => {}),
    spyOn(console, "debug").mockImplementation(() => {}),
  ];
});

afterEach(() => {
  for (const consoleSpy of consoleSpies) {
    consoleSpy.mockRestore();
  }
  clearAuthenticationState();
});

describe("createEvent saga - optimistic rendering", () => {
  let store: ReturnType<typeof createStoreWithEvents>;

  beforeEach(() => {
    clearApiMocks();
    store = createStoreWithEvents([]);
    sagaMiddleware.run(sagas);

    mockEventApiCreate.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
      } as ApiResponse<void>);
    });
  });

  it("should immediately add event with optimistic ID when created", () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Get all events from state
    const state = store.getState();
    const eventEntities = state.events.entities.value || {};
    const eventIds = Object.keys(eventEntities);

    // Should have exactly one event
    expect(eventIds).toHaveLength(1);

    const optimisticId = eventIds[0];
    const optimisticEvent = eventEntities[optimisticId];

    // Event should have a valid ID and be optimistic
    expect(optimisticEvent._id).toBe(optimisticId);

    // Event should be in week and day event lists
    const weekEventIds = state.events.getWeekEvents.value?.data || [];
    const dayEventIds = state.events.getDayEvents.value?.data || [];

    expect(weekEventIds).toContain(optimisticId);
    expect(dayEventIds).toContain(optimisticId);
  });

  it("should keep event in state during API call", async () => {
    // Create a promise that we can control
    let resolveApiCall: (value: ApiResponse<void>) => void;
    const apiPromise = new Promise<ApiResponse<void>>((resolve) => {
      resolveApiCall = resolve;
    });

    mockEventApiCreate.mockImplementation(() => apiPromise);

    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Get the optimistic ID immediately after dispatch
    const stateAfterDispatch = store.getState();
    const eventEntitiesAfterDispatch =
      stateAfterDispatch.events.entities.value || {};
    const optimisticIds = Object.keys(eventEntitiesAfterDispatch);
    expect(optimisticIds).toHaveLength(1);
    const optimisticId = optimisticIds[0];

    // Verify event is still in state while API call is pending
    const stateDuringApiCall = store.getState();
    const eventDuringApiCall = selectEventById(
      stateDuringApiCall,
      optimisticId,
    );

    expect(eventDuringApiCall).not.toBeNull();
    expect(eventDuringApiCall?._id).toBe(optimisticId);

    // Verify event is still in week and day lists
    const weekEventIdsDuringCall =
      stateDuringApiCall.events.getWeekEvents.value?.data || [];
    const dayEventIdsDuringCall =
      stateDuringApiCall.events.getDayEvents.value?.data || [];

    expect(weekEventIdsDuringCall).toContain(optimisticId);
    expect(dayEventIdsDuringCall).toContain(optimisticId);

    // Resolve the API call
    resolveApiCall?.({
      status: 200,
    } as ApiResponse<void>);

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify event is still in state after API call completes with the SAME ID
    const stateAfterApiCall = store.getState();
    const eventAfterApiCall = selectEventById(stateAfterApiCall, optimisticId);

    // Event should still exist with same ID
    expect(eventAfterApiCall).not.toBeNull();
    expect(eventAfterApiCall?._id).toBe(optimisticId);
  });

  it("should confirm optimistic event after successful API call", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;

    // Mock API to return success
    mockEventApiCreate.mockResolvedValue({
      status: 200,
    } as ApiResponse<void>);

    const action = createEventSlice.actions.request(event);
    store.dispatch(action);

    // Get ID immediately
    const initialState = store.getState();
    const initialEventEntities = initialState.events.entities.value || {};
    const optimisticIds = Object.keys(initialEventEntities);
    expect(optimisticIds).toHaveLength(1);
    const eventId = optimisticIds[0];

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const finalState = store.getState();
    const eventEntities = finalState.events.entities.value || {};
    const eventIds = Object.keys(eventEntities);

    // Should still have exactly one event
    expect(eventIds).toHaveLength(1);

    // The event should have the same ID
    expect(eventIds[0]).toBe(eventId);

    // Verify the event is confirmed (not optimistic anymore)
    const finalEvent = selectEventById(finalState, eventId);
    expect(finalEvent).not.toBeNull();
    expect(finalEvent?._id).toBe(eventId);
  });

  it("should never remove event from state after being added", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Get optimistic ID immediately
    const initialState = store.getState();
    const initialEventEntities = initialState.events.entities.value || {};
    const optimisticIds = Object.keys(initialEventEntities);
    expect(optimisticIds).toHaveLength(1);
    const eventId = optimisticIds[0];

    // Check 1: Immediately after dispatch (should be optimistic)
    const check1 = store.getState();
    const event1 = selectEventById(check1, eventId);
    expect(event1).not.toBeNull();
    expect(event1?._id).toBe(eventId);

    // Wait for API call to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check 2: After API call completes (should still have same ID but not optimistic)
    const check2 = store.getState();
    const event2 = selectEventById(check2, eventId);

    expect(event2).not.toBeNull();
    expect(event2?._id).toBe(eventId);

    // Final verification: event should exist with same ID
    const finalState = store.getState();
    const finalEventEntities = finalState.events.entities.value || {};
    const finalEventCount = Object.keys(finalEventEntities).length;

    // Should have exactly one event
    expect(finalEventCount).toBe(1);
    expect(finalEventEntities[eventId]).toBeDefined();

    // Verify event count never dropped to zero
    expect(finalEventCount).toBeGreaterThanOrEqual(1);
  });

  it("should maintain event in week and day event lists throughout creation process", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Get optimistic ID
    const initialState = store.getState();
    const initialEventEntities = initialState.events.entities.value || {};
    const optimisticIds = Object.keys(initialEventEntities);
    expect(optimisticIds).toHaveLength(1);
    const eventId = optimisticIds[0];

    // Verify in lists immediately
    const initialWeekIds = initialState.events.getWeekEvents.value?.data || [];
    const initialDayIds = initialState.events.getDayEvents.value?.data || [];
    expect(initialWeekIds).toContain(eventId);
    expect(initialDayIds).toContain(eventId);

    // Wait for API call to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify still in lists with SAME ID
    const finalState = store.getState();
    const finalWeekIds = finalState.events.getWeekEvents.value?.data || [];
    const finalDayIds = finalState.events.getDayEvents.value?.data || [];

    expect(finalWeekIds).toContain(eventId);
    expect(finalDayIds).toContain(eventId);

    // Should have exactly one event in each list
    expect(finalWeekIds).toHaveLength(1);
    expect(finalDayIds).toHaveLength(1);
  });
});

describe("pending events state management", () => {
  let store: ReturnType<typeof createStoreWithEvents>;

  beforeEach(() => {
    clearApiMocks();
    store = createStoreWithEvents([]);
    sagaMiddleware.run(sagas);

    mockEventApiCreate.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
      } as ApiResponse<void>);
    });

    mockEventApiEdit.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
      } as ApiResponse<void>);
    });
  });

  describe("createEvent saga", () => {
    it("should add event to pending when creation starts", () => {
      const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
      const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
      const action = createEventSlice.actions.request(event);

      store.dispatch(action);

      const state = store.getState();
      const eventEntities = state.events.entities.value || {};
      const eventIds = Object.keys(eventEntities);
      const eventId = eventIds[0];

      const isPending = selectIsEventPending(state, eventId);
      expect(isPending).toBe(true);
      expect(state.events.pendingEvents.eventIds).toContain(eventId);
    });

    it("should remove event from pending on successful creation", async () => {
      const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
      const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
      const action = createEventSlice.actions.request(event);

      store.dispatch(action);

      const initialState = store.getState();
      const eventEntities = initialState.events.entities.value || {};
      const eventIds = Object.keys(eventEntities);
      const eventId = eventIds[0];

      // Wait for saga to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalState = store.getState();
      const isPending = selectIsEventPending(finalState, eventId);
      expect(isPending).toBe(false);
      expect(finalState.events.pendingEvents.eventIds).not.toContain(eventId);
    });

    it("should remove event from pending on creation error", async () => {
      const error = new Error("API Error");
      mockEventApiCreate.mockImplementation(async () => {
        throw error;
      });

      const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
      const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
      const action = createEventSlice.actions.request(event);

      store.dispatch(action);

      // Wait for saga to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = store.getState();
      // Event should be removed from pending even on error
      expect(state.events.pendingEvents.eventIds).toHaveLength(0);
    });
  });

  describe("editEvent saga", () => {
    it("should add event to pending when edit starts", async () => {
      // First create an event
      const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
      const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
      const createAction = createEventSlice.actions.request(event);

      store.dispatch(createAction);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stateAfterCreate = store.getState();
      const eventEntities = stateAfterCreate.events.entities.value || {};
      const eventIds = Object.keys(eventEntities);
      const eventId = eventIds[0];

      // Now edit the event - get the actual event from store
      const existingEvent = selectEventById(
        stateAfterCreate,
        eventId,
      ) as Schema_GridEvent;
      const updatedEvent = {
        ...existingEvent,
        title: "Updated Title",
      } as Schema_WebEvent;
      const editAction = editEventSlice.actions.request({
        _id: eventId,
        event: updatedEvent,
      });

      store.dispatch(editAction);

      const stateAfterEdit = store.getState();
      const isPending = selectIsEventPending(stateAfterEdit, eventId);
      expect(isPending).toBe(true);
      expect(stateAfterEdit.events.pendingEvents.eventIds).toContain(eventId);
    });

    it("should remove event from pending on successful edit", async () => {
      // First create an event
      const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
      const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
      const createAction = createEventSlice.actions.request(event);

      store.dispatch(createAction);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stateAfterCreate = store.getState();
      const eventEntities = stateAfterCreate.events.entities.value || {};
      const eventIds = Object.keys(eventEntities);
      const eventId = eventIds[0];

      // Now edit the event - get the actual event from store
      const existingEvent = selectEventById(
        stateAfterCreate,
        eventId,
      ) as Schema_GridEvent;
      const updatedEvent = {
        ...existingEvent,
        title: "Updated Title",
      } as Schema_WebEvent;
      const editAction = editEventSlice.actions.request({
        _id: eventId,
        event: updatedEvent,
      });

      store.dispatch(editAction);

      // Wait for edit saga to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalState = store.getState();
      const isPending = selectIsEventPending(finalState, eventId);
      expect(isPending).toBe(false);
      expect(finalState.events.pendingEvents.eventIds).not.toContain(eventId);
    });

    it("should remove event from pending on edit error", async () => {
      // First create an event
      const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
      const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
      const createAction = createEventSlice.actions.request(event);

      store.dispatch(createAction);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stateAfterCreate = store.getState();
      const eventEntities = stateAfterCreate.events.entities.value || {};
      const eventIds = Object.keys(eventEntities);
      const eventId = eventIds[0];

      // Mock edit API to fail
      const error = new Error("Edit API Error");
      mockEventApiEdit.mockImplementation(async () => {
        throw error;
      });

      // Now edit the event - get the actual event from store
      const existingEvent = selectEventById(
        stateAfterCreate,
        eventId,
      ) as Schema_GridEvent;
      const updatedEvent = {
        ...existingEvent,
        title: "Updated Title",
      } as Schema_WebEvent;
      const editAction = editEventSlice.actions.request({
        _id: eventId,
        event: updatedEvent,
      });

      store.dispatch(editAction);

      // Wait for edit saga to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalState = store.getState();
      // Event should be removed from pending even on error
      expect(finalState.events.pendingEvents.eventIds).not.toContain(eventId);
    });
  });
});

describe("createEvent saga - unauthenticated users", () => {
  let store: ReturnType<typeof createStoreWithEvents>;

  beforeEach(async () => {
    clearApiMocks();
    clearAuthenticationState();
    try {
      await ensureStorageReady();
      await getStorageAdapter().clearAllEvents();
    } catch (error) {
      console.error(error);
      // Expect errors if database doesn't exist yet
    }
    store = createStoreWithEvents([]);
    sagaMiddleware.run(sagas);

    mockDoesSessionExist.mockResolvedValue(false);
  });

  afterEach(async () => {
    try {
      await getStorageAdapter().clearAllEvents();
    } catch (error) {
      console.error(error);
      // Expect errors if database doesn't exist yet
    }
  });

  it("should save event to IndexedDB when user is not authenticated", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify API was not called
    expect(mockEventApiCreate).not.toHaveBeenCalled();

    // Verify event was saved to IndexedDB
    const state = store.getState();
    const eventEntities = state.events.entities.value || {};
    const eventIds = Object.keys(eventEntities);
    expect(eventIds).toHaveLength(1);

    const eventId = eventIds[0];
    const allEvents = await getStorageAdapter().getAllEvents();
    const savedEvent = allEvents.find((e) => e._id === eventId);
    expect(savedEvent).toBeDefined();
    expect(savedEvent?._id).toBe(eventId);
  });

  it("should remove event from pending after saving to IndexedDB", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const state = store.getState();
    const eventEntities = state.events.entities.value || {};
    const eventIds = Object.keys(eventEntities);
    const eventId = eventIds[0];

    // Event should not be pending anymore
    const isPending = selectIsEventPending(state, eventId);
    expect(isPending).toBe(false);
    expect(state.events.pendingEvents.eventIds).not.toContain(eventId);
  });

  it("should dispatch success action after saving to IndexedDB", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify event was saved successfully (no error and event exists in store)
    const state = store.getState();
    const eventEntities = state.events.entities.value || {};
    const eventIds = Object.keys(eventEntities);
    expect(eventIds.length).toBeGreaterThan(0);

    // Verify event is not pending anymore
    const eventId = eventIds[0];
    const isPending = selectIsEventPending(state, eventId);
    expect(isPending).toBe(false);
  });

  it("should mark the sign-up prompt after anonymous event creation", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;

    store.dispatch(createEventSlice.actions.request(event));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(true);
  });

  it("should mark the sign-up prompt after anonymous event edit", async () => {
    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;

    store.dispatch(createEventSlice.actions.request(event));
    await new Promise((resolve) => setTimeout(resolve, 100));

    clearAnonymousCalendarChangeSignUpPrompt();

    const stateAfterCreate = store.getState();
    const eventId = Object.keys(
      stateAfterCreate.events.entities.value || {},
    )[0];
    const existingEvent = selectEventById(
      stateAfterCreate,
      eventId,
    ) as Schema_GridEvent;

    store.dispatch(
      editEventSlice.actions.request({
        _id: eventId,
        event: {
          ...existingEvent,
          title: "Updated Title",
        } as Schema_WebEvent,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(true);
  });

  it("should not mark the sign-up prompt for previously authenticated users", async () => {
    updateAuthState({ hasAuthenticated: true });

    const gridEvent = createMockStandaloneEvent() as Schema_GridEvent;
    const event = new OnSubmitParser(gridEvent).parse() as Schema_Event;

    store.dispatch(createEventSlice.actions.request(event));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(false);
  });
});
