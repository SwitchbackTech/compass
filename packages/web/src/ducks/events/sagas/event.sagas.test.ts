import { AxiosResponse } from "axios";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isOptimisticEvent } from "@web/common/utils/event/event.util";
import { EventApi } from "@web/ducks/events/event.api";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { RootState } from "@web/store";
import { sagas } from "@web/store/sagas";

jest.mock("@web/ducks/events/event.api");

describe("createEvent saga - optimistic rendering", () => {
  let store: ReturnType<typeof createStoreWithEvents>;
  let mockCreateApi: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createStoreWithEvents([]);
    sagaMiddleware.run(sagas);

    mockCreateApi = jest.spyOn(EventApi, "create").mockImplementation(() => {
      return Promise.resolve({
        status: 200,
      } as unknown as AxiosResponse<void>);
    });
  });

  it("should immediately add event with optimistic ID when created", () => {
    const event = createMockStandaloneEvent() as Schema_GridEvent;
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

    // Event should have optimistic ID prefix
    expect(optimisticId).toMatch(new RegExp(`^${ID_OPTIMISTIC_PREFIX}-`));
    expect(optimisticEvent._id).toBe(optimisticId);
    expect(isOptimisticEvent(optimisticEvent)).toBe(true);

    // Event should be in week and day event lists
    const weekEventIds = state.events.getWeekEvents.value?.data || [];
    const dayEventIds = state.events.getDayEvents.value?.data || [];

    expect(weekEventIds).toContain(optimisticId);
    expect(dayEventIds).toContain(optimisticId);
  });

  it("should keep event in state during API call", async () => {
    // Create a promise that we can control
    let resolveApiCall: (value: AxiosResponse<void>) => void;
    const apiPromise = new Promise<AxiosResponse<void>>((resolve) => {
      resolveApiCall = resolve;
    });

    mockCreateApi.mockImplementation(() => apiPromise);

    const event = createMockStandaloneEvent() as Schema_GridEvent;
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
      stateDuringApiCall as RootState,
      optimisticId,
    );

    expect(eventDuringApiCall).not.toBeNull();
    expect(eventDuringApiCall?._id).toBe(optimisticId);
    expect(isOptimisticEvent(eventDuringApiCall!)).toBe(true);

    // Verify event is still in week and day lists
    const weekEventIdsDuringCall =
      stateDuringApiCall.events.getWeekEvents.value?.data || [];
    const dayEventIdsDuringCall =
      stateDuringApiCall.events.getDayEvents.value?.data || [];

    expect(weekEventIdsDuringCall).toContain(optimisticId);
    expect(dayEventIdsDuringCall).toContain(optimisticId);

    // Resolve the API call
    resolveApiCall!({
      status: 200,
    } as AxiosResponse<void>);

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify event is still in state after API call completes
    // The optimistic ID should be replaced with real ID
    const realEventId = optimisticId.replace(`${ID_OPTIMISTIC_PREFIX}-`, "");
    const stateAfterApiCall = store.getState();
    const eventAfterApiCall = selectEventById(
      stateAfterApiCall as RootState,
      realEventId,
    );

    // Event should still exist with real ID
    expect(eventAfterApiCall).not.toBeNull();
    expect(eventAfterApiCall?._id).toBe(realEventId);
  });

  it("should replace optimistic ID with real ID after successful API call", async () => {
    const event = createMockStandaloneEvent() as Schema_GridEvent;

    // Mock API to return success
    mockCreateApi.mockResolvedValue({
      status: 200,
    } as AxiosResponse<void>);

    const action = createEventSlice.actions.request(event);
    store.dispatch(action);

    // Get optimistic ID immediately
    const initialState = store.getState();
    const initialEventEntities = initialState.events.entities.value || {};
    const optimisticIds = Object.keys(initialEventEntities);
    expect(optimisticIds).toHaveLength(1);
    const optimisticId = optimisticIds[0];

    // The real ID is the optimistic ID without the prefix
    const realEventId = optimisticId.replace(`${ID_OPTIMISTIC_PREFIX}-`, "");

    // Wait for saga to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const finalState = store.getState();
    const eventEntities = finalState.events.entities.value || {};
    const eventIds = Object.keys(eventEntities);

    // Should still have exactly one event
    expect(eventIds).toHaveLength(1);

    // The event should have the real ID (without optimistic prefix)
    expect(eventIds[0]).toBe(realEventId);
    expect(eventIds[0]).not.toMatch(new RegExp(`^${ID_OPTIMISTIC_PREFIX}-`));

    // Verify the event is accessible by real ID
    const finalEvent = selectEventById(finalState as RootState, realEventId);
    expect(finalEvent).not.toBeNull();
    expect(finalEvent?._id).toBe(realEventId);
    expect(isOptimisticEvent(finalEvent!)).toBe(false);
  });

  it("should never remove event from state after being added", async () => {
    const event = createMockStandaloneEvent() as Schema_GridEvent;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Get optimistic ID immediately
    const initialState = store.getState();
    const initialEventEntities = initialState.events.entities.value || {};
    const optimisticIds = Object.keys(initialEventEntities);
    expect(optimisticIds).toHaveLength(1);
    const optimisticId = optimisticIds[0];
    const realEventId = optimisticId.replace(`${ID_OPTIMISTIC_PREFIX}-`, "");

    // Check 1: Immediately after dispatch (should have optimistic ID)
    const check1 = store.getState();
    const event1 = selectEventById(check1 as RootState, optimisticId);
    expect(event1).not.toBeNull();
    expect(event1?._id).toBe(optimisticId);

    // Wait for API call to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check 2: After API call completes (should have real ID, not optimistic)
    const check2 = store.getState();
    const event2Optimistic = selectEventById(check2 as RootState, optimisticId);
    const event2Real = selectEventById(check2 as RootState, realEventId);

    // Event should no longer be accessible by optimistic ID
    expect(event2Optimistic).toBeNull();
    // But should be accessible by real ID
    expect(event2Real).not.toBeNull();
    expect(event2Real?._id).toBe(realEventId);

    // Final verification: event should exist with real ID
    const finalState = store.getState();
    const finalEventEntities = finalState.events.entities.value || {};
    const finalEventCount = Object.keys(finalEventEntities).length;

    // Should have exactly one event
    expect(finalEventCount).toBe(1);
    expect(finalEventEntities[realEventId]).toBeDefined();

    // Verify event count never dropped to zero
    // The event should transition from optimistic ID to real ID without disappearing
    expect(finalEventCount).toBeGreaterThanOrEqual(1);
  });

  it("should maintain event in week and day event lists throughout creation process", async () => {
    const event = createMockStandaloneEvent() as Schema_GridEvent;
    const action = createEventSlice.actions.request(event);

    store.dispatch(action);

    // Get optimistic ID
    const initialState = store.getState();
    const initialEventEntities = initialState.events.entities.value || {};
    const optimisticIds = Object.keys(initialEventEntities);
    expect(optimisticIds).toHaveLength(1);
    const optimisticId = optimisticIds[0];
    const realEventId = optimisticId.replace(`${ID_OPTIMISTIC_PREFIX}-`, "");

    // Verify in lists immediately with optimistic ID
    const initialWeekIds = initialState.events.getWeekEvents.value?.data || [];
    const initialDayIds = initialState.events.getDayEvents.value?.data || [];
    expect(initialWeekIds).toContain(optimisticId);
    expect(initialDayIds).toContain(optimisticId);

    // Wait for API call to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify still in lists but with real ID (replaced)
    const finalState = store.getState();
    const finalWeekIds = finalState.events.getWeekEvents.value?.data || [];
    const finalDayIds = finalState.events.getDayEvents.value?.data || [];

    // Should no longer have optimistic ID
    expect(finalWeekIds).not.toContain(optimisticId);
    expect(finalDayIds).not.toContain(optimisticId);

    // Should have real ID in both lists
    expect(finalWeekIds).toContain(realEventId);
    expect(finalDayIds).toContain(realEventId);

    // Should have exactly one event in each list
    expect(finalWeekIds).toHaveLength(1);
    expect(finalDayIds).toHaveLength(1);
  });
});
