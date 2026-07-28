import { act, renderHook } from "@testing-library/react";
import { type Event } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { Categories_Event } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import {
  type Activity_DraftEvent,
  draftActions,
} from "@web/events/stores/draft.store";
import { CROSS_ROW_TIMED_DURATION_MIN } from "@web/grid/interaction/math/cross-row.drag";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { getDragDurationMinutes } from "./drag-duration.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// useCalendarsQuery (called by useDraftActions) reads useSession() to decide
// its anon-vs-authenticated branch. mock.module on that path is process-wide
// and several sibling test files register it without restoring it (see
// CalendarList.test.tsx), so this file can inherit whatever value another
// file left behind depending on cross-file load order. Registering it here
// too - matching the real SessionContext default (no SessionProvider is
// mounted in this file's tests) - keeps this file's tests deterministic
// regardless of what any other file does.
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: () => ({ authenticated: false, setAuthenticated: () => {} }),
}));

let currentState = createInitialState();

const { useDraftActions } =
  require("./useDraftActions") as typeof import("./useDraftActions");

const sourceEvent: Event = {
  id: "0123456789abcdef01234567",
  calendarId: "0123456789abcdef76543210",
  content: { kind: "details", title: "Seed event", description: "" },
  schedule: {
    kind: "timed",
    start: "2024-01-15T10:00:00.000Z",
    end: "2024-01-15T11:30:00.000Z",
    timeZone: "UTC",
  },
  recurrence: { kind: "single" },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: null,
} as unknown as Event;

const createEditDraft = (
  scheduleOverrides: Partial<{
    start: string;
    end: string;
    isAllDay: boolean;
  }> = {},
): GridEventDraft => {
  const draft = editGridEventDraft(sourceEvent);
  if (!draft || draft.kind !== "edit")
    throw new Error("Expected an edit draft");

  const { isAllDay, start, end } = scheduleOverrides;

  return {
    ...draft,
    values: {
      ...draft.values,
      schedule: isAllDay
        ? {
            kind: "allDay",
            start: new Date(start ?? "2024-01-16T00:00:00.000Z"),
            end: new Date(end ?? "2024-01-17T00:00:00.000Z"),
          }
        : {
            kind: "timed",
            start: new Date(start ?? "2024-01-16T10:00:00.000Z"),
            end: new Date(end ?? "2024-01-16T11:00:00.000Z"),
            timeZone: "UTC",
          },
    },
  };
};

const createNewDraft = (
  scheduleOverrides: Partial<{
    start: string;
    end: string;
    isAllDay: boolean;
  }> = {},
): GridEventDraft => {
  const { isAllDay, start, end } = scheduleOverrides;

  return createGridEventDraft(
    isAllDay
      ? {
          kind: "allDay",
          start: new Date(start ?? "2024-01-16T00:00:00.000Z"),
          end: new Date(end ?? "2024-01-17T00:00:00.000Z"),
        }
      : {
          kind: "timed",
          start: new Date(start ?? "2024-01-16T10:00:00.000Z"),
          end: new Date(end ?? "2024-01-16T11:00:00.000Z"),
          timeZone: "UTC",
        },
  );
};

describe("getDragDurationMinutes", () => {
  const schedule = {
    kind: "timed" as const,
    start: new Date("2024-01-15T10:00:00.000Z"),
    end: new Date("2024-01-15T11:30:00.000Z"),
    timeZone: "UTC",
  };

  it("uses the draft duration before drag status is ready", () => {
    expect(getDragDurationMinutes(schedule, null)).toBe(90);
  });

  it("uses the tracked duration once available", () => {
    expect(
      getDragDurationMinutes(schedule, {
        durationMin: 45,
      }),
    ).toBe(45);
  });
});

const createState = (
  overrides: Partial<State_Draft_Local> = {},
): State_Draft_Local => ({
  dateBeingChanged: "endDate",
  draft: createEditDraft(),
  dragOffset: { x: 0, y: 0 },
  dragStatus: null,
  isDragging: false,
  isFormOpen: true,
  isFormOpenBeforeDragging: null,
  isResizing: false,
  resizeStatus: null,
  ...overrides,
});

const createSetters = (
  overrides: Partial<Setters_Draft> = {},
): Setters_Draft => ({
  setDateBeingChanged: mock(),
  setDraft: mock(),
  setDragOffset: mock(),
  setDragStatus: mock(),
  setIsDragging: mock(),
  setIsFormOpen: mock(),
  setIsFormOpenBeforeDragging: mock(),
  setIsResizing: mock(),
  setResizeStatus: mock(),
  ...overrides,
});

const dateCalcs = {
  getDateByXY: (x: number, y: number, startOfView: dayjs.Dayjs) => {
    const dayOffset = Math.max(0, Math.floor(x / 100));
    const minutes = Math.max(0, Math.floor(y / 2 / 15) * 15);
    return startOfView.add(dayOffset, "day").add(minutes, "minutes");
  },
  getDateStrByXY: (x: number, y: number, startOfView: dayjs.Dayjs) =>
    dateCalcs.getDateByXY(x, y, startOfView).format(),
} as DateCalcs;

const weekProps = {
  component: {
    endOfView: dayjs("2024-01-21T23:59:59.999Z"),
    startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    week: 3,
  },
  util: {
    getLastNavigationSource: () => "manual",
  },
} as unknown as WeekProps;

const mountDraftDragDom = () => {
  document.body.innerHTML = "";
  const allDayRow = document.createElement("div");
  const mainGrid = document.createElement("div");
  allDayRow.id = ID_GRID_ALLDAY_ROW;
  mainGrid.id = ID_GRID_MAIN;
  allDayRow.getBoundingClientRect = () =>
    ({
      top: 20,
      bottom: 60,
      left: 0,
      right: 700,
      height: 40,
      width: 700,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.append(allDayRow, mainGrid);
};

const setDraftActivity = (
  activity: Activity_DraftEvent,
  eventType = Categories_Event.TIMED,
) => {
  currentState.events!.draft = currentState.events!.draft ?? {};
  currentState.events!.draft.status = {
    activity,
    eventType,
    isDrafting: true,
    isFormOpen: false,
  };
};

const renderDraftActions = (
  draft: GridEventDraft,
  stateOverrides: Partial<State_Draft_Local> = {},
) => {
  const setDraft = mock();
  const setDragOffset = mock();
  const setDragStatus = mock();
  currentState.events!.draft = {
    ...currentState.events!.draft,
    gridDraft: draft,
  };
  draftActions.setGridDraft(draft);
  const { wrapper } = createStoreWrapper(currentState);
  const { result } = renderHook(
    () =>
      useDraftActions(
        createState({ draft, ...stateOverrides }),
        createSetters({ setDraft, setDragOffset, setDragStatus }),
        dateCalcs,
        weekProps,
      ),
    { wrapper },
  );

  setDraft.mockClear();
  setDragOffset.mockClear();
  setDragStatus.mockClear();

  return { result, setDraft, setDragOffset, setDragStatus };
};

const expectDraftRange = (
  setDraft: ReturnType<typeof mock>,
  startDate: string,
  endDate: string,
) => {
  const nextDraft = setDraft.mock.calls[0]?.[0] as GridEventDraft;

  expect(dayjs(nextDraft.values.schedule.start).isSame(startDate)).toBe(true);
  expect(dayjs(nextDraft.values.schedule.end).isSame(endDate)).toBe(true);
};

describe("useDraftActions", () => {
  beforeEach(() => {
    const draft = createEditDraft();
    currentState = createInitialState();
    currentState.events!.draft = {
      gridDraft: draft,
      status: {
        activity: "eventRightClick",
        eventType: Categories_Event.TIMED,
        isDrafting: true,
        isFormOpen: false,
      },
    };
  });

  it("moves a shortcut-created timed draft by keyboard while preserving duration", () => {
    setDraftActivity("createShortcut");
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowDown");

    expectDraftRange(
      setDraft,
      "2024-01-16T10:15:00.000Z",
      "2024-01-16T11:15:00.000Z",
    );
  });

  it("moves a mouse-created timed draft by keyboard while preserving duration", () => {
    setDraftActivity("gridClick");
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowDown");

    expectDraftRange(
      setDraft,
      "2024-01-16T10:15:00.000Z",
      "2024-01-16T11:15:00.000Z",
    );
  });

  it("moves a clicked existing timed event draft by keyboard", () => {
    setDraftActivity("gridClick");
    const { result, setDraft } = renderDraftActions(
      createEditDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowLeft");

    expectDraftRange(
      setDraft,
      "2024-01-15T10:00:00.000Z",
      "2024-01-15T11:00:00.000Z",
    );
  });

  it("moves a keyboard-opened existing timed event draft by keyboard", () => {
    setDraftActivity("keyboardEdit");
    const { result, setDraft } = renderDraftActions(
      createEditDraft({
        start: "2024-01-16T10:00:00.000Z",
        end: "2024-01-16T11:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T10:00:00.000Z",
      "2024-01-17T11:00:00.000Z",
    );
  });

  it("does not move a timed draft past midnight", () => {
    setDraftActivity("createShortcut");
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        start: "2024-01-16T23:00:00.000Z",
        end: "2024-01-17T00:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });

  it("moves a clicked existing all-day event draft horizontally and ignores vertical arrows", () => {
    setDraftActivity("gridClick", Categories_Event.ALLDAY);
    const { result, setDraft } = renderDraftActions(
      createEditDraft({
        isAllDay: true,
        start: "2024-01-16T00:00:00.000Z",
        end: "2024-01-17T00:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T00:00:00.000Z",
      "2024-01-18T00:00:00.000Z",
    );

    setDraft.mockClear();
    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });

  it("moves a shortcut-created all-day draft horizontally and ignores vertical arrows", () => {
    setDraftActivity("createShortcut", Categories_Event.ALLDAY);
    const { result, setDraft } = renderDraftActions(
      createNewDraft({
        isAllDay: true,
        start: "2024-01-16T00:00:00.000Z",
        end: "2024-01-17T00:00:00.000Z",
      }),
    );

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T00:00:00.000Z",
      "2024-01-18T00:00:00.000Z",
    );

    setDraft.mockClear();
    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });

  // A live drag-create must not turn into a local resize: `resize()` freezes
  // the store draft as its origin, and during creation that draft moves with
  // the pointer, which would collapse its math.
  it("mirrors a live drag-create into local state without starting a resize", () => {
    setDraftActivity("creating");
    const draft = createNewDraft({
      start: "2024-01-16T10:00:00.000Z",
      end: "2024-01-16T11:00:00.000Z",
    });
    const setDraft = mock();
    const setIsResizing = mock();

    currentState.events!.draft = {
      ...currentState.events!.draft,
      gridDraft: draft,
    };
    const { wrapper } = createStoreWrapper(currentState);

    renderHook(
      () =>
        useDraftActions(
          createState({ draft: null }),
          createSetters({ setDraft, setIsResizing }),
          dateCalcs,
          weekProps,
        ),
      { wrapper },
    );

    expect(setDraft).toHaveBeenCalledWith(draft);
    // The mount effect calls setIsResizing(false) to clear stale state; what
    // must never happen is a resize being switched *on*.
    expect(setIsResizing).not.toHaveBeenCalledWith(true);
  });

  it("converts a new all-day draft to timed while dragging over the timed grid", () => {
    mountDraftDragDom();
    setDraftActivity("gridClick", Categories_Event.ALLDAY);
    const draft = createNewDraft({
      isAllDay: true,
      start: "2024-01-16T00:00:00.000Z",
      end: "2024-01-17T00:00:00.000Z",
    });
    const { result, setDraft, setDragOffset, setDragStatus } =
      renderDraftActions(draft, {
        isDragging: true,
        dragOffset: { x: 10, y: 5 },
        dragStatus: { durationMin: 24 * 60 },
      });

    act(() => {
      result.current.drag({ clientX: 100, clientY: 200 });
    });

    const nextDraft = setDraft.mock.calls[0]?.[0] as GridEventDraft;
    expect(nextDraft.values.schedule.kind).toBe("timed");
    expect(
      dayjs(nextDraft.values.schedule.end).diff(
        nextDraft.values.schedule.start,
        "minutes",
      ),
    ).toBe(CROSS_ROW_TIMED_DURATION_MIN);
    expect(setDragOffset).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect(setDragStatus).toHaveBeenCalled();
  });

  it("converts an existing all-day edit draft to timed while dragging over the timed grid", () => {
    mountDraftDragDom();
    setDraftActivity("gridClick", Categories_Event.ALLDAY);
    const draft = createEditDraft({
      isAllDay: true,
      start: "2024-01-16T00:00:00.000Z",
      end: "2024-01-17T00:00:00.000Z",
    });
    const { result, setDraft } = renderDraftActions(draft, {
      isDragging: true,
      dragOffset: { x: 8, y: 4 },
      dragStatus: { durationMin: 24 * 60, hasMoved: false },
    });

    act(() => {
      result.current.drag({ clientX: 200, clientY: 180 });
    });

    const nextDraft = setDraft.mock.calls[0]?.[0] as GridEventDraft;
    expect(nextDraft.kind).toBe("edit");
    expect(nextDraft.values.schedule.kind).toBe("timed");
  });

  it("converts on drag start when the pointer is already over the timed grid", () => {
    mountDraftDragDom();
    setDraftActivity("gridClick", Categories_Event.ALLDAY);
    const draft = createNewDraft({
      isAllDay: true,
      start: "2024-01-16T00:00:00.000Z",
      end: "2024-01-17T00:00:00.000Z",
    });
    const { result, setDraft } = renderDraftActions(draft, {
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      dragStatus: { durationMin: 24 * 60 },
    });

    act(() => {
      result.current.startDragging(
        { x: 10, y: 5 },
        { clientX: 100, clientY: 200 },
      );
    });

    const nextDraft = setDraft.mock.calls[0]?.[0] as GridEventDraft;
    expect(nextDraft.values.schedule.kind).toBe("timed");
    expect(
      dayjs(nextDraft.values.schedule.end).diff(
        nextDraft.values.schedule.start,
        "minutes",
      ),
    ).toBe(CROSS_ROW_TIMED_DURATION_MIN);
  });
});
