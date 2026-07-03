import userEvent from "@testing-library/user-event";
import { act } from "react";
import { Provider } from "react-redux";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@web/__tests__/__mocks__/mock.render";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { CALENDAR_TIMED_EVENT_FAN_INDENT } from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarGridMeasurements } from "@web/common/calendar-grid/types/calendarGrid.types";
import {
  DATA_CALENDAR_TIMED_GRID_ROW,
  ZIndex,
} from "@web/common/constants/web.constants";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { selectIsEventFormOpen } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type EventFormProps } from "@web/views/Forms/hooks/useEventForm";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

let store: ReturnType<typeof createStoreWithEvents>;
let seededEvents: Schema_Event[] = [];
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

let latestEventForm: EventFormProps | null = null;

mock.module("@web/components/FloatingEventForm/FloatingEventForm", () => ({
  FloatingEventForm: ({ form }: { form: EventFormProps }) => {
    latestEventForm = form;

    return getIsFormOpen() ? (
      <dialog aria-label="Event form" open>
        <input aria-label="Event Title" autoFocus />
      </dialog>
    ) : null;
  },
}));

const { DayCalendarGrid } =
  require("./DayCalendarGrid") as typeof import("./DayCalendarGrid");

const renderDayCalendarGrid = () => ({
  user: userEvent.setup(),
  ...render(
    <>
      <Provider store={store}>
        <DayCalendarGrid />
      </Provider>
      <button type="button">Outside calendar</button>
    </>,
    { events: seededEvents },
  ),
});

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
  seededEvents = events;
  store = createStoreWithEvents(events);
};

const getDraft = () => store.getState().events.draft.event;
const getIsFormOpen = () => selectIsEventFormOpen(store.getState());

const resetDraft = () => {
  store.dispatch(draftSlice.actions.discard(undefined));
};

const getTimedGrid = () =>
  screen.getByRole("region", {
    name: "Timed events grid",
  });

const getTimedSlot = (index = 0) => {
  const slot = getTimedGrid().querySelectorAll<HTMLElement>(
    `[${DATA_CALENDAR_TIMED_GRID_ROW}='true']`,
  )[index];

  expect(slot).toBeDefined();

  return slot;
};

const getAllDayRegion = () =>
  screen.getByRole("region", { name: "All-day events" });

const setDraftEvent = (event: Schema_Event) => {
  store.dispatch(draftSlice.actions.startGridClick(event));
};

const expectFormAnchoredTo = (card: HTMLElement, cardRect: DOMRect) => {
  const positionReference = latestEventForm?.refs.reference.current;
  const domReference = latestEventForm?.refs.domReference.current;

  expect(domReference).toBe(card);
  expect(positionReference).toBeDefined();
  expect(positionReference).not.toBeInstanceOf(Element);
  expect(positionReference?.getBoundingClientRect()).toEqual(cardRect);
  expect(
    positionReference && "contextElement" in positionReference
      ? positionReference.contextElement
      : undefined,
  ).toBe(card);
};

beforeEach(() => {
  seededEvents = [];
  store = createStoreWithEvents([]);
  latestEventForm = null;
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

    const timedGrid = getTimedGrid();
    expect(within(timedGrid).getAllByRole("columnheader")).toHaveLength(1);
  });

  it("renders all-day and timed regions without rendering tasks", () => {
    renderDayCalendarGrid();

    expect(getAllDayRegion()).toBeInTheDocument();
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

  it("keeps a focused Day deck card in its fan-out stack", () => {
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
    const initialBackZIndex = Number(back.style.zIndex);

    expect(initialBackZIndex).toBeLessThan(ZIndex.MAX);

    back.focus();
    expect(Number(back.style.zIndex)).toBe(initialBackZIndex);

    back.blur();
    expect(Number(back.style.zIndex)).toBe(initialBackZIndex);
  });

  it("keeps a clicked overlapping Day event in its fan-out stack without widening it", async () => {
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
    const { user } = renderDayCalendarGrid();

    const back = screen.getByRole("button", { name: /back overlap/i });
    const front = screen.getByRole("button", { name: /front overlap/i });
    const initialBackWidth = parseFloat(back.style.width);
    const initialBackZIndex = Number(back.style.zIndex);
    const frontWidth = parseFloat(front.style.width);

    expect(initialBackWidth).toBe(frontWidth);
    expect(initialBackZIndex).toBeLessThan(ZIndex.MAX);

    await user.click(back);

    await waitFor(() => {
      expect(getDraft()?._id).toBe("back");
      expect(Number(back.style.zIndex)).toBe(initialBackZIndex);
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

  it("anchors the event form through a virtual element that tracks the Day card", async () => {
    const event = createTimedEvent({
      _id: "virtual-reference",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Virtual reference",
    });
    const cardRect = new DOMRect(20, 40, 160, 60);

    setDayEvents([event]);
    const { user } = renderDayCalendarGrid();

    const card = screen.getByRole("button", { name: /virtual reference/i });
    card.getBoundingClientRect = () => cardRect;

    card.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(getDraft()?._id).toBe(event._id);
    });

    expectFormAnchoredTo(card, cardRect);
  });

  it("anchors the event form opened by a Day card pointer interaction", async () => {
    const event = createTimedEvent({
      _id: "pointer-reference",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Pointer reference",
    });
    const cardRect = new DOMRect(20, 40, 160, 60);

    setDayEvents([event]);
    const { user } = renderDayCalendarGrid();

    const card = screen.getByRole("button", { name: /pointer reference/i });
    card.getBoundingClientRect = () => cardRect;

    await user.click(card);

    await waitFor(() => {
      expect(getDraft()?._id).toBe(event._id);
    });

    expectFormAnchoredTo(card, cardRect);
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
    const { user } = renderDayCalendarGrid();
    await user.pointer([
      {
        keys: "[MouseRight>]",
        target: screen.getByRole("button", { name: /right click event/i }),
      },
      { keys: "[/MouseRight]" },
    ]);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.queryByText("Delete Event")).not.toBeInTheDocument();
  });

  it("dismisses an open form when pressing empty Day timed calendar space", async () => {
    const event = createTimedEvent({
      _id: "open-draft",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Open draft",
    });

    setDayEvents([event]);
    const { user } = renderDayCalendarGrid();
    await user.click(
      screen.getByRole("button", { name: /timed event: open draft/i }),
    );
    expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();

    const emptySlot = getTimedSlot(3);
    await user.pointer([
      {
        coords: { clientX: 100, clientY: 120 },
        keys: "[MouseLeft>]",
        target: emptySlot,
      },
      {
        coords: { clientX: 100, clientY: 120 },
        keys: "[/MouseLeft]",
        target: emptySlot,
      },
    ]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByRole("dialog", { name: "Event form" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /timed event: untitled event/i }),
    ).not.toBeInTheDocument();
  });

  it("dismisses the event form when pressing outside the calendar", async () => {
    const event = createTimedEvent({
      _id: "outside-press",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Outside press",
    });

    setDayEvents([event]);
    const { user } = renderDayCalendarGrid();
    await user.click(
      screen.getByRole("button", { name: /timed event: outside press/i }),
    );
    expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();

    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("button", { name: "Outside calendar" }),
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Event form" }),
      ).not.toBeInTheDocument();
    });

    await user.pointer({ keys: "[/MouseLeft]" });
  });

  it("opens the form for a new all-day draft", async () => {
    const { user } = renderDayCalendarGrid();

    await user.pointer({
      coords: { clientX: 100, clientY: 1 },
      keys: "[MouseLeft>]",
      target: getAllDayRegion(),
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /all-day event: untitled event/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      screen.getByRole("button", {
        name: /all-day event: untitled event/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Event Title" })).toHaveFocus();

    await user.pointer({ keys: "[/MouseLeft]" });
  });

  it("dismisses an open form when pressing empty Day all-day calendar space", async () => {
    const event = createTimedEvent({
      _id: "open-from-all-day-grid",
      endDate: "2026-05-20T10:00:00.000",
      startDate: "2026-05-20T09:00:00.000",
      title: "Open from all-day grid",
    });

    setDayEvents([event]);
    const { user } = renderDayCalendarGrid();
    await user.click(
      screen.getByRole("button", {
        name: /timed event: open from all-day grid/i,
      }),
    );
    expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();

    await user.pointer([
      {
        coords: { clientX: 100, clientY: 20 },
        keys: "[MouseLeft>]",
        target: getAllDayRegion(),
      },
      {
        coords: { clientX: 100, clientY: 20 },
        keys: "[/MouseLeft]",
        target: getAllDayRegion(),
      },
    ]);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Event form" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", {
        name: /all-day event: untitled event/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("opens the form for a new timed draft", async () => {
    const { user } = renderDayCalendarGrid();
    const emptySlot = getTimedSlot(3);

    await user.pointer([
      {
        coords: { clientX: 100, clientY: 120 },
        keys: "[MouseLeft>]",
        target: emptySlot,
      },
      {
        coords: { clientX: 100, clientY: 120 },
        keys: "[/MouseLeft]",
        target: emptySlot,
      },
    ]);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /timed event: untitled event/i }),
      ).toBeVisible();
      expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();
    });
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

    fireEvent.mouseDown(getAllDayRegion(), {
      button: 0,
      clientX: 100,
      clientY: 80,
    });

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

    fireEvent.mouseDown(getTimedSlot(3), {
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
      expect(screen.getByRole("dialog", { name: "Event form" })).toBeVisible();
    });
  });

  it("opens the timed draft form after stray zero-button mousemove events", async () => {
    renderDayCalendarGrid();

    fireEvent.mouseDown(getTimedSlot(3), {
      button: 0,
      clientX: 100,
      clientY: 120,
    });
    fireEvent.mouseMove(window, {
      buttons: 1,
      clientX: 100,
      clientY: 300,
    });
    fireEvent.mouseMove(window, {
      buttons: 0,
      clientX: 20,
      clientY: 20,
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
      expect(getIsFormOpen()).toBe(true);
    });
  });
});
