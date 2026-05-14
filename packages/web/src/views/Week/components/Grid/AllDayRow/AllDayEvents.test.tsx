import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { type Store } from "redux";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type RootState } from "@web/store";
import { reducers } from "@web/store/reducers";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { AllDayEvents } from "./AllDayEvents";
import { describe, expect, it } from "bun:test";

const configureTestStore = configureStore as unknown as (
  options: unknown,
) => Store<RootState>;

const createStoreWithWeekEvent = (event: Schema_Event) => {
  const preloadedState = createInitialState() as RootState;
  preloadedState.events.entities.value = { [event._id!]: event };
  preloadedState.events.getWeekEvents.value = {
    count: 1,
    data: [event._id!],
    offset: 0,
    page: 1,
    pageSize: 1,
  };

  return configureTestStore({
    middleware: (getDefaultMiddleware: (options: unknown) => unknown) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
    preloadedState,
    reducer: reducers,
  });
};

const measurements = {
  allDayRow: null,
  colWidths: Array(7).fill(100),
  hourHeight: 70,
  mainGrid: null,
} as Measurements_Grid;

describe("AllDayEvents", () => {
  it("marks all-day resize handles for V2 while preserving the legacy resize dispatch", () => {
    const event = {
      _id: "event-1",
      endDate: "2026-05-15",
      isAllDay: true,
      isSomeday: false,
      origin: "compass",
      priority: "unassigned",
      startDate: "2026-05-13",
      title: "Board review",
      updatedAt: "2026-05-01T00:00:00.000Z",
      user: "user-1",
    } as Schema_Event;
    const store = createStoreWithWeekEvent(event);
    const { container } = render(
      <Provider store={store}>
        <AllDayEvents
          measurements={measurements}
          startOfView={dayjs("2026-05-10")}
          endOfView={dayjs("2026-05-16")}
        />
      </Provider>,
    );
    const eventButton = container.querySelector<HTMLElement>(
      "[data-week-event-kind='allDay']",
    );
    const endHandle = eventButton?.querySelector<HTMLElement>(
      "[data-week-event-resize-handle='endDate']",
    );

    expect(eventButton).not.toBeNull();
    expect(endHandle).not.toBeNull();

    fireEvent.mouseDown(endHandle!);

    expect(store.getState().events.draft.status).toMatchObject({
      dateToResize: "endDate",
      eventType: Categories_Event.ALLDAY,
    });
  });
});
