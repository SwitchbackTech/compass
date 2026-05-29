import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { type Schema_Event, type WithCompassId } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  editEventSlice,
  eventsEntitiesSlice,
} from "@web/ducks/events/slices/event.slice";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it } from "bun:test";

const { useUpdateEvent } =
  require("@web/common/hooks/useUpdateEvent") as typeof import("@web/common/hooks/useUpdateEvent");

describe("useUpdateEvent", () => {
  let actions: unknown[] = [];
  let store: ReturnType<typeof createStore>;
  const mockEvent: WithCompassId<Schema_Event> = {
    _id: "123",
    title: "Test Event",
    startDate: "2023-01-01",
    endDate: "2023-01-01",
  };

  const createStore = () =>
    configureStore({
      preloadedState: createInitialState(),
      reducer: reducers,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          immutableCheck: false,
          serializableCheck: false,
          thunk: false,
        }).concat(() => (next) => (action) => {
          actions.push(action);
          return next(action);
        }),
    });

  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(Provider, { children, store });

  beforeEach(() => {
    actions = [];
    store = createStore();
    store.dispatch(
      eventsEntitiesSlice.actions.insert({ [mockEvent._id]: mockEvent }),
    );
    actions = [];
  });

  it("should update event in store and dispatch request when saveImmediate is true", () => {
    const { result } = renderHook(() => useUpdateEvent(), { wrapper });
    const changedEvent = { ...mockEvent, title: "Updated Event" };
    const payload = { event: changedEvent as Schema_WebEvent };

    result.current(payload);

    expect(store.getState().events.draft.event).toEqual(changedEvent);
    expect(actions).toContainEqual(
      editEventSlice.actions.request({
        ...payload,
        _id: mockEvent._id,
      }),
    );
  });

  it("should update event in store but NOT dispatch request when saveImmediate is false", () => {
    const { result } = renderHook(() => useUpdateEvent(), { wrapper });
    const changedEvent = { ...mockEvent, title: "Updated Event" };
    const payload = { event: changedEvent as Schema_WebEvent };

    result.current(payload, false);

    expect(store.getState().events.draft.event).toEqual(changedEvent);
    expect(actions).toContainEqual(draftSlice.actions.setEvent(changedEvent));
    expect(
      actions.some(
        (action) =>
          typeof action === "object" &&
          action !== null &&
          "type" in action &&
          action.type === editEventSlice.actions.request.type,
      ),
    ).toBe(false);
  });

  it("should not do anything if event has no _id", () => {
    const { result } = renderHook(() => useUpdateEvent(), { wrapper });
    const payload = {
      event: {
        ...mockEvent,
        _id: undefined,
      } as unknown as Schema_WebEvent,
    };

    result.current(payload);

    expect(store.getState().events.draft.event).toBeNull();
    expect(actions).toEqual([]);
  });
});
