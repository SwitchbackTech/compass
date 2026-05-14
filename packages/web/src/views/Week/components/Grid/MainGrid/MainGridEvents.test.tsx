import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { type Store } from "redux";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type RootState } from "@web/store";
import { reducers } from "@web/store/reducers";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { MainGridEvents } from "./MainGridEvents";
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

const weekProps = {
  component: {
    endOfView: dayjs("2026-05-16T23:59:59.999Z"),
    startOfView: dayjs("2026-05-10T00:00:00.000Z"),
  },
} as WeekProps;

describe("MainGridEvents", () => {
  it("marks timed resize handles for V2 without dispatching legacy live motion", () => {
    const event = {
      _id: "event-1",
      endDate: "2026-05-13T10:00:00.000Z",
      isAllDay: false,
      isSomeday: false,
      origin: "compass",
      priority: "unassigned",
      startDate: "2026-05-13T09:00:00.000Z",
      title: "Planning",
      updatedAt: "2026-05-01T00:00:00.000Z",
      user: "user-1",
    } as Schema_Event;
    const store = createStoreWithWeekEvent(event);
    const { container } = render(
      <Provider store={store}>
        <div id="mainGrid">
          <MainGridEvents measurements={measurements} weekProps={weekProps} />
        </div>
      </Provider>,
    );
    const eventButton = container.querySelector<HTMLElement>(
      "[data-week-event-kind='timed']",
    );
    const endHandle = eventButton?.querySelector<HTMLElement>(
      "[data-week-event-resize-handle='endDate']",
    );

    expect(eventButton).not.toBeNull();
    expect(endHandle).not.toBeNull();

    fireEvent.mouseDown(endHandle!);

    expect(store.getState().events.draft.status).toMatchObject({
      activity: null,
      dateToResize: null,
      eventType: null,
      isDrafting: false,
    });
  });
});
