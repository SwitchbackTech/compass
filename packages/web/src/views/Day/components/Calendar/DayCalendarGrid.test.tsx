import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { CALENDAR_TIMED_EVENT_FAN_INDENT } from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarGridMeasurements } from "@web/common/calendar-grid/types/calendarGrid.types";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

let store: ReturnType<typeof createStoreWithEvents>;
const originalScroll = HTMLElement.prototype.scroll;

const measurements = {
  allDayRow: {
    bottom: 40,
    height: 40,
    left: 0,
    right: 180,
    top: 0,
    width: 180,
    x: 0,
    y: 0,
  },
  colWidths: [180],
  hourHeight: 60,
  mainGrid: {
    bottom: 780,
    height: 780,
    left: 0,
    right: 180,
    top: 0,
    width: 180,
    x: 0,
    y: 0,
  },
} satisfies CalendarGridMeasurements;

mock.module("@web/views/Day/hooks/navigation/useDateInView", () => ({
  useDateInView: () => dayjs("2026-05-20T00:00:00.000"),
}));

mock.module("@web/common/calendar-grid/hooks/useCalendarGridLayout", () => ({
  useCalendarGridLayout: () => {
    const allDayColumnsRef = { current: null as HTMLDivElement | null };
    const mainGridRef = { current: null as HTMLDivElement | null };
    const timedColumnsRef = { current: null as HTMLDivElement | null };

    return {
      gridRefs: {
        allDayColumnsRef,
        allDayRef: (node: HTMLDivElement | null) => {
          allDayColumnsRef.current = node;
        },
        allDayRowRef: mock(),
        mainGridElementRef: (node: HTMLDivElement | null) => {
          mainGridRef.current = node;
        },
        mainGridRef,
        timedColumnsElementRef: (node: HTMLDivElement | null) => {
          timedColumnsRef.current = node;
        },
        timedColumnsRef,
      },
      measurements,
    };
  },
}));

const floatingUi =
  require("@floating-ui/react") as typeof import("@floating-ui/react");
const useDismissMock = mock(floatingUi.useDismiss);

mock.module("@floating-ui/react", () => ({
  ...floatingUi,
  useDismiss: useDismissMock,
}));

mock.module("@web/components/FloatingEventForm/FloatingEventForm", () => ({
  FloatingEventForm: () => null,
}));

const { DayCalendarGrid } =
  require("./DayCalendarGrid") as typeof import("./DayCalendarGrid");

const renderDayCalendarGrid = () =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <DayCalendarGrid />
      </ThemeProvider>
    </Provider>,
  );

const createTimedEvent = (
  overrides: Partial<Schema_Event> & {
    _id: string;
    startDate: string;
    endDate: string;
  },
): Schema_Event =>
  ({
    isAllDay: false,
    isSomeday: false,
    recurrence: undefined,
    title: overrides._id,
    user: "user",
    ...overrides,
  }) as Schema_Event;

const createAllDayEvent = (
  overrides: Partial<Schema_Event> & {
    _id: string;
    startDate: string;
    endDate: string;
  },
): Schema_Event =>
  ({
    isAllDay: true,
    isSomeday: false,
    recurrence: undefined,
    title: overrides._id,
    user: "user",
    ...overrides,
  }) as Schema_Event;

const setDayEvents = (events: Schema_Event[]) => {
  store = createStoreWithEvents(events);
};

const getDraft = () => store.getState().events.draft.event;

const resetDraft = () => {
  store.dispatch(draftSlice.actions.discard(undefined));
};

const setDraftEvent = (event: Schema_Event) => {
  store.dispatch(draftSlice.actions.startGridClick(event));
};

const getDismissOptions = () => {
  const [, options] = useDismissMock.mock.calls.at(-1) ?? [];

  expect(options).toBeDefined();

  return options as {
    enabled: boolean;
    outsidePress?: (event: MouseEvent) => boolean;
    outsidePressEvent: string;
  };
};

beforeEach(() => {
  store = createStoreWithEvents([]);
  useDismissMock.mockClear();
});

afterEach(() => {
  cleanup();
  if (originalScroll) {
    HTMLElement.prototype.scroll = originalScroll;
  } else {
    delete (HTMLElement.prototype as { scroll?: unknown }).scroll;
  }
  resetDraft();
});

describe("DayCalendarGrid", () => {
  it("renders one timed column", () => {
    renderDayCalendarGrid();

    const timedGrid = screen.getByRole("region", {
      name: "Timed events grid",
    });
    expect(within(timedGrid).getAllByRole("columnheader")).toHaveLength(1);
  });

  it("renders all-day and timed regions without rendering tasks", () => {
    renderDayCalendarGrid();

    expect(
      screen.getByRole("region", { name: "All-day events" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Task list" }),
    ).not.toBeInTheDocument();
  });

  it("lays overlapping timed events out as a left-anchored deck", () => {
    setDayEvents([
      createTimedEvent({
        _id: "early-overlap",
        endDate: "2026-05-20T10:30:00.000",
        startDate: "2026-05-20T09:00:00.000",
        title: "Early overlap",
      }),
      createTimedEvent({
        _id: "late-overlap",
        endDate: "2026-05-20T10:45:00.000",
        startDate: "2026-05-20T09:30:00.000",
        title: "Late overlap",
      }),
      createTimedEvent({
        _id: "solo",
        endDate: "2026-05-20T15:00:00.000",
        startDate: "2026-05-20T14:00:00.000",
        title: "Solo",
      }),
    ]);

    renderDayCalendarGrid();

    const early = screen.getByRole("button", { name: /early overlap/i });
    const late = screen.getByRole("button", { name: /late overlap/i });
    const solo = screen.getByRole("button", { name: /timed event: solo/i });

    expect(parseFloat(early.style.width)).toBe(parseFloat(late.style.width));
    expect(parseFloat(late.style.left) - parseFloat(early.style.left)).toBe(
      CALENDAR_TIMED_EVENT_FAN_INDENT,
    );
    expect(early.style.boxShadow).toContain("0 0 0 0.75px");
    expect(late.style.boxShadow).toContain("0 0 0 0.75px");
    expect(Number(early.style.zIndex)).toBeLessThan(Number(late.style.zIndex));
    expect(parseFloat(solo.style.width)).toBeGreaterThan(
      parseFloat(early.style.width),
    );
  });

  it("raises a focused Day deck card above its group-mates", () => {
    setDayEvents([
      createTimedEvent({
        _id: "back",
        endDate: "2026-05-20T10:30:00.000",
        startDate: "2026-05-20T09:00:00.000",
        title: "Back overlap",
      }),
      createTimedEvent({
        _id: "front",
        endDate: "2026-05-20T10:45:00.000",
        startDate: "2026-05-20T09:30:00.000",
        title: "Front overlap",
      }),
    ]);

    renderDayCalendarGrid();

    const back = screen.getByRole("button", { name: /back overlap/i });

    expect(Number(back.style.zIndex)).toBeLessThan(ZIndex.MAX);

    fireEvent.focus(back);
    expect(Number(back.style.zIndex)).toBe(ZIndex.MAX);

    fireEvent.blur(back);
    expect(Number(back.style.zIndex)).toBeLessThan(ZIndex.MAX);
  });

  it("raises a clicked overlapping Day event above its group-mates without widening it", async () => {
    setDayEvents([
      createTimedEvent({
        _id: "back",
        endDate: "2026-05-20T10:30:00.000",
        startDate: "2026-05-20T09:00:00.000",
        title: "Back overlap",
      }),
      createTimedEvent({
        _id: "front",
        endDate: "2026-05-20T10:45:00.000",
        startDate: "2026-05-20T09:30:00.000",
        title: "Front overlap",
      }),
    ]);

    renderDayCalendarGrid();

    const back = screen.getByRole("button", { name: /back overlap/i });
    const front = screen.getByRole("button", { name: /front overlap/i });
    const initialBackWidth = parseFloat(back.style.width);
    const frontWidth = parseFloat(front.style.width);

    expect(initialBackWidth).toBe(frontWidth);
    expect(Number(back.style.zIndex)).toBeLessThan(ZIndex.MAX);

    fireEvent.pointerDown(back, {
      button: 0,
      clientX: 100,
      clientY: 120,
      isPrimary: true,
      pointerId: 1,
    });
    fireEvent.pointerUp(window, {
      button: 0,
      clientX: 100,
      clientY: 120,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(getDraft()?._id).toBe("back");
      expect(Number(back.style.zIndex)).toBe(ZIndex.MAX);
      expect(parseFloat(back.style.width)).toBe(frontWidth);
    });
  });

  it("keeps an existing draft event registered for Day calendar interactions", () => {
    const event = createTimedEvent({
      _id: "existing-draft",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Existing draft",
    });

    setDayEvents([event]);
    setDraftEvent(event);

    renderDayCalendarGrid();

    expect(
      screen
        .getByRole("button", { name: /timed event: existing draft/i })
        .getAttribute("data-day-interaction-event-id"),
    ).toBe("existing-draft");
  });

  it("opens the shared event action menu from a Day timed event right-click", async () => {
    setDayEvents([
      createTimedEvent({
        _id: "right-click-event",
        endDate: "2026-05-20T10:00:00.000",
        startDate: "2026-05-20T09:00:00.000",
        title: "Right click event",
      }),
    ]);

    renderDayCalendarGrid();

    fireEvent.contextMenu(
      screen.getByRole("button", { name: /right click event/i }),
      {
        clientX: 100,
        clientY: 120,
      },
    );

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
  });

  it("dismisses an open draft when clicking empty Day timed calendar space", () => {
    const existingDraft = createTimedEvent({
      _id: "open-draft",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Open draft",
    });

    setDraftEvent(existingDraft);
    renderDayCalendarGrid();

    const timedGrid = screen.getByRole("region", {
      name: "Timed events grid",
    });
    const timedGridRow = timedGrid.querySelector(
      "[data-calendar-timed-grid-row='true']",
    );

    expect(timedGridRow).toBeInstanceOf(HTMLElement);

    fireEvent.mouseDown(timedGridRow!, {
      button: 0,
      clientX: 100,
      clientY: 120,
    });

    expect(getDraft()).toBeNull();
  });

  it("dismisses the floating form after empty agenda mouse handlers run", () => {
    renderDayCalendarGrid();

    expect(getDismissOptions()).toEqual(
      expect.objectContaining({
        enabled: true,
        outsidePress: expect.any(Function),
        outsidePressEvent: "click",
      }),
    );
  });

  it("does not dismiss a new all-day draft from the click that created it", async () => {
    renderDayCalendarGrid();

    const allDayRegion = screen.getByRole("region", { name: "All-day events" });

    fireEvent.mouseDown(allDayRegion, {
      button: 0,
      clientX: 100,
      clientY: 1,
    });

    await waitFor(() => {
      expect(getDraft()?.isAllDay).toBe(true);
    });

    const outsidePress = getDismissOptions().outsidePress;
    expect(outsidePress).toBeDefined();

    const creationClick = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(creationClick, "target", {
      configurable: true,
      value: allDayRegion,
    });

    expect(outsidePress?.(creationClick)).toBe(false);
    expect(outsidePress?.(creationClick)).toBe(true);
  });

  it("dismisses an open draft when clicking empty Day all-day calendar space", () => {
    const existingDraft = createTimedEvent({
      _id: "open-all-day-draft",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Open all-day draft",
    });

    setDraftEvent(existingDraft);
    renderDayCalendarGrid();

    fireEvent.mouseDown(
      screen.getByRole("region", { name: "All-day events" }),
      {
        button: 0,
        clientX: 100,
        clientY: 20,
      },
    );

    expect(getDraft()).toBeNull();
  });

  it("places a new all-day draft below existing all-day events", async () => {
    setDayEvents([
      createAllDayEvent({
        _id: "first-all-day",
        endDate: "2026-05-21",
        startDate: "2026-05-20",
        title: "First all-day",
      }),
      createAllDayEvent({
        _id: "second-all-day",
        endDate: "2026-05-21",
        startDate: "2026-05-20",
        title: "Second all-day",
      }),
    ]);
    renderDayCalendarGrid();

    fireEvent.mouseDown(
      screen.getByRole("region", { name: "All-day events" }),
      {
        button: 0,
        clientX: 100,
        clientY: 80,
      },
    );

    await waitFor(() => {
      const draft = screen.getByRole("button", {
        name: /all-day event: untitled event/i,
      });
      const first = screen.getByRole("button", {
        name: /all-day event: first all-day/i,
      });
      const second = screen.getByRole("button", {
        name: /all-day event: second all-day/i,
      });

      expect(parseFloat(draft.style.top)).toBeGreaterThan(
        parseFloat(first.style.top),
      );
      expect(parseFloat(draft.style.top)).toBeGreaterThan(
        parseFloat(second.style.top),
      );
    });
  });

  it("scrolls the Day timed grid to now when the Day view requests it", () => {
    const scroll = mock();

    HTMLElement.prototype.scroll = scroll;
    renderDayCalendarGrid();
    scroll.mockClear();

    compassEventEmitter.emit(CompassDOMEvents.SCROLL_TO_NOW_LINE);

    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: "smooth",
        top: expect.any(Number),
      }),
    );
  });

  it("creates the selected timed range when dragging from an empty timed slot", async () => {
    renderDayCalendarGrid();

    const timedGrid = screen.getByRole("region", {
      name: "Timed events grid",
    });
    const timedGridRow = timedGrid.querySelector(
      "[data-calendar-timed-grid-row='true']",
    );

    expect(timedGridRow).toBeInstanceOf(HTMLElement);

    fireEvent.mouseDown(timedGridRow!, {
      button: 0,
      clientX: 100,
      clientY: 120,
    });
    fireEvent.mouseMove(window, {
      buttons: 1,
      clientX: 100,
      clientY: 300,
    });
    fireEvent.mouseUp(window, {
      button: 0,
      clientX: 100,
      clientY: 300,
    });

    await waitFor(() => {
      const draft = getDraft();

      expect(draft).not.toBeNull();
      expect(dayjs(draft?.startDate).format("HH:mm")).toBe("02:00");
      expect(dayjs(draft?.endDate).format("HH:mm")).toBe("05:00");
    });
  });
});
