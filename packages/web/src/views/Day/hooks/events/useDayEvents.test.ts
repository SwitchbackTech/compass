import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it } from "bun:test";

const { useDayEvents } =
  require("@web/views/Day/hooks/events/useDayEvents") as typeof import("@web/views/Day/hooks/events/useDayEvents");

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

let actions: unknown[] = [];
let store: ReturnType<typeof createStore>;

function wrapper({ children }: PropsWithChildren) {
  return createElement(Provider, { children, store });
}

describe("useDayEvents", () => {
  beforeEach(() => {
    actions = [];
    store = createStore();
  });

  it("dispatches day events request for the provided date", () => {
    const initialDate = dayjs.utc("2025-11-11T00:00:00Z");
    const expectedStart = initialDate.startOf("day").format();
    const expectedEnd = initialDate.endOf("day").format();

    renderHook(() => useDayEvents(initialDate), { wrapper });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(
      getDayEventsSlice.actions.request({
        startDate: expectedStart,
        endDate: expectedEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  });

  it("re-dispatches when the date range changes", () => {
    const initialDate = dayjs.utc("2025-11-11T00:00:00Z");
    const { rerender } = renderHook(({ date }) => useDayEvents(date), {
      initialProps: { date: initialDate },
      wrapper,
    });

    expect(actions).toHaveLength(1);

    const nextDate = initialDate.add(1, "day");
    rerender({ date: nextDate });
    const expectedStart = nextDate.startOf("day").format();
    const expectedEnd = nextDate.endOf("day").format();
    expect(actions).toHaveLength(2);

    expect(actions[1]).toEqual(
      getDayEventsSlice.actions.request({
        startDate: expectedStart,
        endDate: expectedEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  });
});
