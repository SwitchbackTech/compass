import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ID_GRID_COLUMNS_TIMED } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { DRAFT_DURATION_MIN } from "@web/views/Week/layout.constants";
import { afterEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

const { MainGrid } = await import("./MainGrid");

afterEach(() => {
  cleanup();
});

const startOfView = dayjs("2024-01-14T00:00:00.000");

const createStore = () =>
  configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });

const createDateCalcs = () => ({
  getDateByXY: (_x: number, y: number, firstDayInView: Dayjs) =>
    firstDayInView.add(y, "minute"),
  getDayNumberByX: () => 0,
  getDateStrByXY: (_x: number, y: number, firstDayInView: Dayjs) =>
    firstDayInView.add(y, "minute").format(),
  getMinuteByY: (y: number) => y,
  getYByDate: () => 0,
});

const createWeekProps = () => ({
  component: {
    category: "current" as const,
    endOfView: startOfView.endOf("week"),
    isCurrentWeek: true,
    startOfView,
    week: startOfView.week(),
    weekDays: Array.from({ length: 7 }, (_, index) =>
      startOfView.add(index, "day"),
    ),
  },
  state: { setStartOfView: mock() },
  util: {
    decrementWeek: mock(),
    getLastNavigationSource: mock(() => "manual" as const),
    goToToday: mock(),
    incrementWeek: mock(),
  },
});

const renderMainGrid = () => {
  const store = createStore();
  const dateCalcs = createDateCalcs();
  const mainGridRef = { current: null };
  const actions = {
    stopDragging: mock(),
    stopResizing: mock(),
  };

  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <DraftContext.Provider
          value={
            {
              actions,
              confirmation: {},
              setters: {},
              state: {},
            } as never
          }
        >
          <MainGrid
            dateCalcs={dateCalcs}
            mainGridElementRef={mock()}
            mainGridRef={mainGridRef}
            measurements={{
              allDayRow: null,
              colWidths: [100, 100, 100, 100, 100, 100, 100],
              hourHeight: 60,
              mainGrid: {
                bottom: 780,
                height: 780,
                left: 0,
                right: 700,
                top: 0,
                width: 700,
                x: 0,
                y: 0,
              },
            }}
            today={startOfView}
            weekProps={createWeekProps()}
          />
        </DraftContext.Provider>
      </ThemeProvider>
    </Provider>,
  );

  return { ...view, store };
};

const dragEmptyGrid = (
  row: HTMLElement,
  { fromMinute, toMinute }: { fromMinute: number; toMinute: number },
) => {
  fireEvent.mouseDown(row, {
    button: 0,
    buttons: 1,
    clientX: 100,
    clientY: fromMinute,
  });
  fireEvent.mouseMove(window, { buttons: 1, clientX: 100, clientY: toMinute });
  fireEvent.mouseUp(window, { clientX: 100, clientY: toMinute });
};

const clickEmptyGrid = (row: HTMLElement, minute: number) => {
  fireEvent.mouseDown(row, {
    button: 0,
    buttons: 1,
    clientX: 100,
    clientY: minute,
  });
  fireEvent.mouseUp(window, { clientX: 100, clientY: minute });
};

const expectDraftRange = async (
  store: ReturnType<typeof createStore>,
  startDate: string,
  endDate: string,
) => {
  await waitFor(() => {
    const draft = store.getState().events.draft.event;

    expect(draft?.startDate).toBe(startDate);
    expect(draft?.endDate).toBe(endDate);
  });
};

const getFirstTimedGridRow = (container: HTMLElement) => {
  const timedColumns = container.querySelector(`#${ID_GRID_COLUMNS_TIMED}`);
  const timedRows = timedColumns?.nextElementSibling;

  if (!(timedRows?.firstElementChild instanceof HTMLElement)) {
    throw new Error("Timed grid row was not rendered");
  }

  return timedRows.firstElementChild;
};

describe("MainGrid empty-grid draft creation", () => {
  it("creates the selected range when dragging upward from an empty timed slot", async () => {
    const { container, store } = renderMainGrid();
    const row = getFirstTimedGridRow(container);

    dragEmptyGrid(row, { fromMinute: 11 * 60, toMinute: 10 * 60 });

    await expectDraftRange(
      store,
      startOfView.add(10, "hour").format(),
      startOfView.add(11, "hour").format(),
    );
  });

  it("keeps creating the selected range when dragging downward from an empty timed slot", async () => {
    const { container, store } = renderMainGrid();
    const row = getFirstTimedGridRow(container);

    dragEmptyGrid(row, { fromMinute: 11 * 60, toMinute: 12 * 60 });

    await expectDraftRange(
      store,
      startOfView.add(11, "hour").format(),
      startOfView.add(12, "hour").format(),
    );
  });

  it("keeps quick empty-grid clicks at the default draft duration", async () => {
    const { container, store } = renderMainGrid();
    const row = getFirstTimedGridRow(container);

    clickEmptyGrid(row, 11 * 60);

    await expectDraftRange(
      store,
      startOfView.add(11, "hour").format(),
      startOfView.add(11, "hour").add(DRAFT_DURATION_MIN, "minute").format(),
    );
  });
});
