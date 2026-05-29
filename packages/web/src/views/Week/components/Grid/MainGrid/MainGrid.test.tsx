import { configureStore } from "@reduxjs/toolkit";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { type Schema_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import {
  ID_GRID_COLUMNS_TIMED,
  ZIndex,
} from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { pendingEventsSlice } from "@web/ducks/events/slices/pending.slice";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import {
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/weekEventRegistry";
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import {
  clearHoveredCalendarEventTarget,
  getHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";
import {
  DECK_INDENT,
  DRAFT_DURATION_MIN,
} from "@web/views/Week/layout.constants";
import { afterEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

const { AllDayEvents } = await import("../AllDayRow/AllDayEvents");
const { AllDayRow } = await import("../AllDayRow/AllDayRow");
const { Grid } = await import("../Grid");
const { MainGrid } = await import("./MainGrid");
const { MainGridEvents } = await import("./MainGridEvents");

afterEach(() => {
  clearHoveredCalendarEventTarget();
  cleanup();
  setWeekInteractionMotionActive(false);
  weekEventRegistry.clear();
});

const startOfView = dayjs("2024-01-14T00:00:00.000");
const measurements = {
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
} satisfies Measurements_Grid;

const createStore = (events: Schema_Event[] = []) => {
  const preloadedState = createInitialState();
  const eventIds: string[] = [];
  const eventEntities: Record<string, Schema_Event> = {};

  for (const event of events) {
    if (!event._id) {
      continue;
    }

    eventIds.push(event._id);
    eventEntities[event._id] = event;
  }

  preloadedState.events.entities!.value = eventEntities;
  preloadedState.events.getWeekEvents!.value = {
    count: eventIds.length,
    data: eventIds,
    offset: 0,
    page: 1,
    pageSize: eventIds.length || 1,
  };

  return configureStore({
    preloadedState,
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });
};

const createDateCalcs = () => ({
  getDateByXY: (_x: number, y: number, firstDayInView: Dayjs) =>
    firstDayInView.add(y, "minute"),
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

const createSavedEvent = (
  overrides: Partial<Schema_Event> = {},
): Schema_Event =>
  ({
    _id: "saved-event",
    endDate: "2024-01-15T10:00:00.000Z",
    isAllDay: false,
    recurrence: undefined,
    startDate: "2024-01-15T09:00:00.000Z",
    title: "Saved event",
    ...overrides,
  }) as Schema_Event;

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
            measurements={measurements}
            timedColumnsElementRef={mock()}
            today={startOfView}
            weekProps={createWeekProps()}
          />
        </DraftContext.Provider>
      </ThemeProvider>
    </Provider>,
  );

  return { ...view, store };
};

const renderGridRegions = () => {
  const store = createStore();
  const dateCalcs = createDateCalcs();
  const mainGridRef = { current: null };

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <DraftContext.Provider
          value={
            {
              actions: {
                stopDragging: mock(),
                stopResizing: mock(),
              },
              confirmation: {},
              setters: {},
              state: {},
            } as never
          }
        >
          <AllDayRow
            allDayRef={mock()}
            allDayRowRef={mock()}
            dateCalcs={dateCalcs}
            measurements={measurements}
            weekProps={createWeekProps()}
          />
          <MainGrid
            dateCalcs={dateCalcs}
            mainGridElementRef={mock()}
            mainGridRef={mainGridRef}
            measurements={measurements}
            timedColumnsElementRef={mock()}
            today={startOfView}
            weekProps={createWeekProps()}
          />
        </DraftContext.Provider>
      </ThemeProvider>
    </Provider>,
  );
};

const renderWeekGrid = (events: Schema_Event[] = []) => {
  const store = createStore(events);
  const dateCalcs = createDateCalcs();

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <DraftContext.Provider
          value={
            {
              actions: {
                stopDragging: mock(),
                stopResizing: mock(),
              },
              confirmation: {},
              setters: {},
              state: {},
            } as never
          }
        >
          <Grid
            dateCalcs={dateCalcs}
            gridRefs={{
              allDayColumnsRef: { current: null },
              allDayRef: mock(),
              allDayRowRef: mock(),
              mainGridElementRef: mock(),
              mainGridRef: { current: null },
              timedColumnsElementRef: mock(),
              timedColumnsRef: { current: null },
            }}
            measurements={measurements}
            today={startOfView}
            weekProps={createWeekProps()}
          />
        </DraftContext.Provider>
      </ThemeProvider>
    </Provider>,
  );
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
  fireEvent.mouseMove(window, {
    buttons: 1,
    clientX: 100,
    clientY: toMinute,
  });
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

const expectDraftIsInactive = (store: ReturnType<typeof createStore>) => {
  const draftStatus = store.getState().events.draft.status;

  if (!draftStatus) {
    throw new Error("Draft status was not initialized");
  }

  expect(draftStatus.activity).toBeNull();
  expect(draftStatus.isDrafting).toBe(false);
};

const getEndResizeHandle = (eventButton: HTMLElement) => {
  const resizeHandle = eventButton.querySelector(
    '[data-calendar-event-resize-handle="endDate"]',
  );

  if (!(resizeHandle instanceof HTMLElement)) {
    throw new Error("Saved event resize handle was not rendered");
  }

  return resizeHandle;
};

const expectSavedEventDoesNotStartDraftMotion = (
  store: ReturnType<typeof createStore>,
) => {
  const eventButton = screen.getByRole("button", { name: /saved event/i });

  fireEvent.mouseDown(eventButton, { button: 0, buttons: 1 });
  expectDraftIsInactive(store);

  fireEvent.mouseDown(getEndResizeHandle(eventButton), {
    button: 0,
    buttons: 1,
  });
  expectDraftIsInactive(store);
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

describe("Week calendar accessibility", () => {
  it("labels timed and all-day calendar regions", () => {
    renderGridRegions();

    expect(
      screen.getByRole("region", { name: "Timed events grid" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "All-day events" }),
    ).toBeInTheDocument();
  });

  it("gives saved timed events a title and time accessible name", () => {
    const store = createStore([
      createSavedEvent({
        _id: "labeled-event",
        endDate: "2024-01-15T10:00:00.000Z",
        startDate: "2024-01-15T09:00:00.000Z",
        title: "Planning block",
      }),
    ]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MainGridEvents
            measurements={measurements}
            weekProps={createWeekProps()}
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(
      screen.getByRole("button", {
        name: /timed event: planning block, .*9.*10.*am/i,
      }),
    ).toBeInTheDocument();
  });

  it("marks pending saved events as unavailable", () => {
    const event = createSavedEvent({
      _id: "pending-event",
      title: "Pending save",
    });
    const store = createStore([event]);
    store.dispatch(pendingEventsSlice.actions.add("pending-event"));

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MainGridEvents
            measurements={measurements}
            weekProps={createWeekProps()}
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(
      screen
        .getByRole("button", { name: /pending save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("marks hovered saved timed events as targeting candidates", () => {
    const store = createStore([
      createSavedEvent({
        _id: "hovered-timed-event",
        title: "Hover target",
      }),
    ]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MainGridEvents
            measurements={measurements}
            weekProps={createWeekProps()}
          />
        </ThemeProvider>
      </Provider>,
    );

    const eventButton = screen.getByRole("button", { name: /hover target/i });

    fireEvent.mouseEnter(eventButton);
    expect(getHoveredCalendarEventTarget()).toMatchObject({
      element: eventButton,
      eventId: "hovered-timed-event",
      eventType: "timed",
    });

    fireEvent.mouseLeave(eventButton);
    expect(getHoveredCalendarEventTarget()).toBeNull();
  });

  it("gives all-day events an all-day accessible name and target type", () => {
    const store = createStore([
      createSavedEvent({
        _id: "labeled-all-day",
        endDate: "2024-01-16T00:00:00.000Z",
        isAllDay: true,
        startDate: "2024-01-15T00:00:00.000Z",
        title: "All-day planning",
      }),
    ]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <AllDayEvents
            endOfView={startOfView.endOf("week")}
            measurements={measurements}
            startOfView={startOfView}
          />
        </ThemeProvider>
      </Provider>,
    );

    const eventButton = screen.getByRole("button", {
      name: /all-day event: all-day planning/i,
    });

    expect(eventButton.getAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE)).toBe(
      "labeled-all-day",
    );
    expect(
      eventButton.getAttribute(WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE),
    ).toBe("all-day");
  });

  it("keeps full-week all-day events spanning seven columns", () => {
    const store = createStore([
      createSavedEvent({
        _id: "full-week-all-day",
        endDate: "2024-01-21T00:00:00.000Z",
        isAllDay: true,
        startDate: "2024-01-14T00:00:00.000Z",
        title: "Full week",
      }),
    ]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <AllDayEvents
            endOfView={startOfView.endOf("week")}
            measurements={measurements}
            startOfView={startOfView}
          />
        </ThemeProvider>
      </Provider>,
    );

    const eventButton = screen.getByRole("button", {
      name: /all-day event: full week/i,
    });

    expect(parseFloat(eventButton.style.width)).toBe(690);
  });

  it("keeps stacked all-day rows wired through the shared Week grid", () => {
    renderWeekGrid([
      createSavedEvent({
        _id: "stacked-all-day-one",
        endDate: "2024-01-16T00:00:00.000Z",
        isAllDay: true,
        startDate: "2024-01-15T00:00:00.000Z",
        title: "Stacked one",
      }),
      createSavedEvent({
        _id: "stacked-all-day-two",
        endDate: "2024-01-16T00:00:00.000Z",
        isAllDay: true,
        startDate: "2024-01-15T00:00:00.000Z",
        title: "Stacked two",
      }),
    ]);

    expect(
      getComputedStyle(screen.getByRole("region", { name: "All-day events" }))
        .height,
    ).toContain("0.09090909090909091");
  });
});

describe("saved Week event ownership", () => {
  it("lays overlapping saved timed events out as a left-anchored deck", () => {
    const store = createStore([
      createSavedEvent({
        _id: "early-overlap",
        endDate: "2024-01-15T19:30:00.000Z",
        startDate: "2024-01-15T18:30:00.000Z",
        title: "Early overlap",
      }),
      createSavedEvent({
        _id: "late-overlap",
        endDate: "2024-01-15T19:45:00.000Z",
        startDate: "2024-01-15T19:00:00.000Z",
        title: "Late overlap",
      }),
      createSavedEvent({
        _id: "solo",
        endDate: "2024-01-15T23:00:00.000Z",
        startDate: "2024-01-15T22:00:00.000Z",
        title: "Solo",
      }),
    ]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MainGridEvents
            measurements={measurements}
            weekProps={createWeekProps()}
          />
        </ThemeProvider>
      </Provider>,
    );

    const early = screen.getByRole("button", { name: /early overlap/i });
    const late = screen.getByRole("button", { name: /late overlap/i });
    const solo = screen.getByRole("button", { name: /timed event: solo/i });

    expect(parseFloat(early.style.width)).toBe(parseFloat(late.style.width));
    const overlapOffset =
      parseFloat(late.style.left) - parseFloat(early.style.left);
    expect(overlapOffset).toBeGreaterThan(DECK_INDENT);

    expect(Number(early.style.zIndex)).toBeLessThan(Number(late.style.zIndex));

    expect(parseFloat(solo.style.width)).toBeGreaterThan(
      parseFloat(early.style.width),
    );
    expect(Number(solo.style.zIndex)).toBe(ZIndex.LAYER_1);
  });

  it("raises a focused deck card above its group-mates", () => {
    const store = createStore([
      createSavedEvent({
        _id: "back",
        endDate: "2024-01-15T19:30:00.000Z",
        startDate: "2024-01-15T18:30:00.000Z",
        title: "Back overlap",
      }),
      createSavedEvent({
        _id: "front",
        endDate: "2024-01-15T19:45:00.000Z",
        startDate: "2024-01-15T19:00:00.000Z",
        title: "Front overlap",
      }),
    ]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MainGridEvents
            measurements={measurements}
            weekProps={createWeekProps()}
          />
        </ThemeProvider>
      </Provider>,
    );

    const back = screen.getByRole("button", { name: /back overlap/i });
    expect(Number(back.style.zIndex)).toBeLessThan(ZIndex.MAX);

    fireEvent.focus(back);
    expect(Number(back.style.zIndex)).toBe(ZIndex.MAX);

    fireEvent.blur(back);
    expect(Number(back.style.zIndex)).toBeLessThan(ZIndex.MAX);
  });

  it("keeps saved timed mouse and resize events out of the draft motion owner", () => {
    const savedEvent = createSavedEvent();
    const store = createStore([savedEvent]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MainGridEvents
            measurements={measurements}
            weekProps={createWeekProps()}
          />
        </ThemeProvider>
      </Provider>,
    );

    expectSavedEventDoesNotStartDraftMotion(store);
  });

  it("keeps saved all-day mouse and resize events out of the draft motion owner", () => {
    const savedEvent = createSavedEvent({
      _id: "saved-all-day-event",
      endDate: "2024-01-17T00:00:00.000Z",
      isAllDay: true,
      startDate: "2024-01-15T00:00:00.000Z",
    });
    const store = createStore([savedEvent]);

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <AllDayEvents
            endOfView={startOfView.endOf("week")}
            measurements={measurements}
            startOfView={startOfView}
          />
        </ThemeProvider>
      </Provider>,
    );

    expectSavedEventDoesNotStartDraftMotion(store);
  });
});
