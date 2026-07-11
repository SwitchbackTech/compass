import { QueryClientProvider } from "@tanstack/react-query";
import { act, type PropsWithChildren } from "react";
import { Priorities } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import {
  seedEventQueries,
  seedPendingEventMutations,
} from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { createCompassQueryClient } from "@web/api/query-client";
import {
  ID_GRID_COLUMNS_TIMED,
  ZIndex,
} from "@web/common/constants/web.constants";
import { gridColorByPriority } from "@web/common/styles/theme.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
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

let pendingEventIds: string[] = [];
let seededWeekEvents: Schema_Event[] = [];

// DateTimeSchema requires an explicit offset; several fixtures below already
// carry one ("Z"), but normalize defensively.
const withOffset = (dateTime: string) =>
  /[Zz]|[+-]\d\d:\d\d$/.test(dateTime) ? dateTime : `${dateTime}Z`;

// The query cache (unlike draft.store.ts, still legacy Schema_Event-shaped
// per its own TODO) requires strict-contract `Event`s.
const toStrictEvent = (event: Schema_Event): Event =>
  createMockEvent({
    id: EventIdSchema.parse(event._id!),
    content: {
      kind: "details",
      title: event.title ?? "",
      description: event.description ?? "",
    },
    schedule: event.isAllDay
      ? EventScheduleSchema.parse({
          kind: "allDay",
          start: event.startDate!.slice(0, 10),
          end: event.endDate!.slice(0, 10),
        })
      : EventScheduleSchema.parse({
          kind: "timed",
          start: withOffset(event.startDate!),
          end: withOffset(event.endDate!),
          timeZone: "UTC",
        }),
  });

function Provider({ children }: PropsWithChildren) {
  const queryClient = createCompassQueryClient();
  seedPendingEventMutations(queryClient, pendingEventIds);
  seedEventQueries(queryClient, seededWeekEvents.map(toStrictEvent));

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

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
  pendingEventIds = [];
  seededWeekEvents = [];
});

const startOfView = dayjs("2024-01-14T00:00:00.000");
const weekDaysInView = Array.from({ length: 7 }, (_, index) =>
  startOfView.add(index, "day"),
);
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

// Seed the event query cache (read when the local Provider mounts its
// QueryClient) and the draft Zustand store.
const seedGrid = (
  events: Schema_Event[] = [],
  draftEvent: Schema_Event | null = null,
) => {
  seededWeekEvents = events;

  if (draftEvent) {
    useDraftStore.setState({
      event: draftEvent,
      status: {
        activity: "keyboardEdit",
        dateToResize: null,
        eventType: draftEvent.isAllDay
          ? Categories_Event.ALLDAY
          : Categories_Event.TIMED,
        isDrafting: true,
        isFormOpen: false,
      },
    });
  }
};

const createDateCalcs = () => ({
  getDateByXY: (_x: number, y: number, firstDayInView: Dayjs) =>
    firstDayInView.add(y, "minute"),
  getDateStrByXY: (
    _x: number,
    y: number,
    firstDayInView: Dayjs,
    format?: string,
  ) => firstDayInView.add(y, "minute").format(format),
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
  state: { goToDate: mock() },
  util: {
    decrementWeek: mock(),
    getLastNavigationSource: mock(() => "manual" as const),
    goToToday: mock(),
    incrementWeek: mock(),
  },
});

// `_id` in `overrides` is a readable test label, not the real id — the query
// cache (toStrictEvent above) requires a real ObjectId, so every fixture
// gets a generated one; tests that need to assert on "which event" read
// `event._id` back off the returned fixture, never a literal.
const createSavedEvent = (
  overrides: Partial<Schema_Event> = {},
): Schema_Event =>
  ({
    endDate: "2024-01-15T10:00:00.000Z",
    isAllDay: false,
    recurrence: undefined,
    startDate: "2024-01-15T09:00:00.000Z",
    title: "Saved event",
    ...overrides,
    _id: createObjectIdString(),
  }) as Schema_Event;

const renderMainGrid = () => {
  seedGrid();
  const dateCalcs = createDateCalcs();
  const mainGridRef = { current: null };
  const actions = {
    stopDragging: mock(),
    stopResizing: mock(),
  };

  const view = render(
    <Provider>
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
    </Provider>,
  );

  return view;
};

const renderGridRegions = () => {
  seedGrid();
  const dateCalcs = createDateCalcs();
  const mainGridRef = { current: null };

  const view = render(
    <Provider>
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
    </Provider>,
  );

  return view;
};

const renderWeekGrid = (events: Schema_Event[] = []) => {
  seedGrid(events);
  const dateCalcs = createDateCalcs();

  return render(
    <Provider>
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

const expectDraftRange = async (startDate: string, endDate: string) => {
  await waitFor(() => {
    const draft = useDraftStore.getState().event;

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

const expectDraftIsInactive = () => {
  const draftStatus = useDraftStore.getState().status;

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

const expectSavedEventDoesNotStartDraftMotion = () => {
  const eventButton = screen.getByRole("button", { name: /saved event/i });

  fireEvent.mouseDown(eventButton, { button: 0, buttons: 1 });
  expectDraftIsInactive();

  fireEvent.mouseDown(getEndResizeHandle(eventButton), {
    button: 0,
    buttons: 1,
  });
  expectDraftIsInactive();
};

describe("MainGrid empty-grid draft creation", () => {
  it("creates the selected range when dragging upward from an empty timed slot", async () => {
    const { container } = renderMainGrid();
    const row = getFirstTimedGridRow(container);

    dragEmptyGrid(row, { fromMinute: 11 * 60, toMinute: 10 * 60 });

    await expectDraftRange(
      startOfView.add(10, "hour").format(),
      startOfView.add(11, "hour").format(),
    );
  });

  it("keeps creating the selected range when dragging downward from an empty timed slot", async () => {
    const { container } = renderMainGrid();
    const row = getFirstTimedGridRow(container);

    dragEmptyGrid(row, { fromMinute: 11 * 60, toMinute: 12 * 60 });

    await expectDraftRange(
      startOfView.add(11, "hour").format(),
      startOfView.add(12, "hour").format(),
    );
  });

  it("keeps quick empty-grid clicks at the default draft duration", async () => {
    const { container } = renderMainGrid();
    const row = getFirstTimedGridRow(container);

    clickEmptyGrid(row, 11 * 60);

    await expectDraftRange(
      startOfView.add(11, "hour").format(),
      startOfView.add(11, "hour").add(DRAFT_DURATION_MIN, "minute").format(),
    );
  });
});

describe("Week calendar accessibility", () => {
  it("creates a one-day draft from empty all-day space", async () => {
    renderGridRegions();

    fireEvent.mouseDown(
      screen.getByRole("region", { name: "All-day events" }),
      { button: 0, clientX: 100, clientY: 0 },
    );

    await waitFor(() =>
      expect(useDraftStore.getState().event).toEqual(
        expect.objectContaining({
          endDate: "2024-01-15",
          isAllDay: true,
          startDate: "2024-01-14",
        }),
      ),
    );
  });

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
    seedGrid([
      createSavedEvent({
        _id: "labeled-event",
        endDate: "2024-01-15T10:00:00.000Z",
        startDate: "2024-01-15T09:00:00.000Z",
        title: "Planning block",
      }),
    ]);

    render(
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </Provider>,
    );

    expect(
      screen.getByRole("button", {
        name: /timed event: planning block, .*9.*10.*am/i,
      }),
    ).toBeInTheDocument();
  });

  it("keeps pending saved events fully interactive", () => {
    const event = createSavedEvent({
      title: "Pending save",
    });
    seedGrid([event]);
    pendingEventIds = [event._id!];

    render(
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </Provider>,
    );

    const card = screen.getByRole("button", { name: /pending save/i });
    expect(card).not.toHaveAttribute("aria-disabled");
    expect(card).toHaveAttribute(
      WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
      event._id,
    );
  });

  it("marks hovered saved timed events as targeting candidates", () => {
    const event = createSavedEvent({
      title: "Hover target",
    });
    seedGrid([event]);

    render(
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </Provider>,
    );

    const eventButton = screen.getByRole("button", { name: /hover target/i });

    fireEvent.mouseEnter(eventButton);
    expect(getHoveredCalendarEventTarget()).toMatchObject({
      element: eventButton,
      eventId: event._id,
      eventType: "timed",
    });

    fireEvent.mouseLeave(eventButton);
    expect(getHoveredCalendarEventTarget()).toBeNull();
  });

  it("updates the timed placeholder color when the active draft priority changes", async () => {
    const savedEvent = createSavedEvent({
      _id: "priority-event",
      title: "Priority event",
    });
    seedGrid([savedEvent], savedEvent);

    render(
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </Provider>,
    );

    const eventButton = screen.getByRole("button", {
      name: /priority event/i,
    });

    expect(eventButton.style.getPropertyValue("--event-bg")).toBe(
      gridColorByPriority[Priorities.UNASSIGNED],
    );

    act(() => {
      draftActions.setEvent({
        ...savedEvent,
        priority: Priorities.WORK,
      });
    });

    await waitFor(() => {
      expect(eventButton.style.getPropertyValue("--event-bg")).toBe(
        gridColorByPriority[Priorities.WORK],
      );
    });
  });

  it("gives all-day events an all-day accessible name and target type", () => {
    const event = createSavedEvent({
      endDate: "2024-01-16T00:00:00.000Z",
      isAllDay: true,
      startDate: "2024-01-15T00:00:00.000Z",
      title: "All-day planning",
    });
    seedGrid([event]);

    render(
      <Provider>
        <AllDayEvents
          endOfView={startOfView.endOf("week")}
          measurements={measurements}
          startOfView={startOfView}
          weekDays={weekDaysInView}
        />
      </Provider>,
    );

    const eventButton = screen.getByRole("button", {
      name: /all-day event: all-day planning/i,
    });

    expect(eventButton.getAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE)).toBe(
      event._id ?? null,
    );
    expect(
      eventButton.getAttribute(WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE),
    ).toBe("all-day");
  });

  it("updates the all-day placeholder color when the active draft priority changes", async () => {
    const savedEvent = createSavedEvent({
      _id: "all-day-priority-event",
      isAllDay: true,
      startDate: "2024-01-15T00:00:00.000Z",
      endDate: "2024-01-16T00:00:00.000Z",
      title: "All-day priority event",
    });
    seedGrid([savedEvent], savedEvent);

    render(
      <Provider>
        <AllDayEvents
          endOfView={startOfView.endOf("week")}
          measurements={measurements}
          startOfView={startOfView}
          weekDays={weekDaysInView}
        />
      </Provider>,
    );

    const eventButton = screen.getByRole("button", {
      name: /all-day event: all-day priority event/i,
    });

    expect(eventButton.style.getPropertyValue("--event-bg")).toBe(
      gridColorByPriority[Priorities.UNASSIGNED],
    );

    act(() => {
      draftActions.setEvent({
        ...savedEvent,
        priority: Priorities.RELATIONS,
      });
    });

    await waitFor(() => {
      expect(eventButton.style.getPropertyValue("--event-bg")).toBe(
        gridColorByPriority[Priorities.RELATIONS],
      );
    });
  });

  it("keeps full-week all-day events spanning seven columns", () => {
    seedGrid([
      createSavedEvent({
        _id: "full-week-all-day",
        endDate: "2024-01-21T00:00:00.000Z",
        isAllDay: true,
        startDate: "2024-01-14T00:00:00.000Z",
        title: "Full week",
      }),
    ]);

    render(
      <Provider>
        <AllDayEvents
          endOfView={startOfView.endOf("week")}
          measurements={measurements}
          startOfView={startOfView}
          weekDays={weekDaysInView}
        />
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
    seedGrid([
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
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
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

  it("keeps a focused deck card in its fan-out stack", () => {
    seedGrid([
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
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </Provider>,
    );

    const back = screen.getByRole("button", { name: /back overlap/i });
    const initialBackZIndex = Number(back.style.zIndex);
    expect(initialBackZIndex).toBeLessThan(ZIndex.MAX);

    fireEvent.focus(back);
    expect(Number(back.style.zIndex)).toBe(initialBackZIndex);

    fireEvent.blur(back);
    expect(Number(back.style.zIndex)).toBe(initialBackZIndex);
  });

  it("keeps saved timed mouse and resize events out of the draft motion owner", () => {
    const savedEvent = createSavedEvent();
    seedGrid([savedEvent]);

    render(
      <Provider>
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </Provider>,
    );

    expectSavedEventDoesNotStartDraftMotion();
  });

  it("keeps saved all-day mouse and resize events out of the draft motion owner", () => {
    const savedEvent = createSavedEvent({
      _id: "saved-all-day-event",
      endDate: "2024-01-17T00:00:00.000Z",
      isAllDay: true,
      startDate: "2024-01-15T00:00:00.000Z",
    });
    seedGrid([savedEvent]);

    render(
      <Provider>
        <AllDayEvents
          endOfView={startOfView.endOf("week")}
          measurements={measurements}
          startOfView={startOfView}
          weekDays={weekDaysInView}
        />
      </Provider>,
    );

    expectSavedEventDoesNotStartDraftMotion();
  });
});
