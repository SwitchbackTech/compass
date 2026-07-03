import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  createInitialState,
  type InitialReduxState,
} from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { getDragDurationMinutes } from "./drag-duration.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let currentState: InitialReduxState = createInitialState();

const { useDraftActions } =
  require("./useDraftActions") as typeof import("./useDraftActions");

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:30:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

describe("getDragDurationMinutes", () => {
  it("uses the draft duration before drag status is ready", () => {
    expect(getDragDurationMinutes(createDraft(), null)).toBe(90);
  });

  it("uses the tracked duration once available", () => {
    expect(
      getDragDurationMinutes(createDraft(), {
        durationMin: 45,
      }),
    ).toBe(45);
  });
});

const createState = (
  overrides: Partial<State_Draft_Local> = {},
): State_Draft_Local => ({
  dateBeingChanged: "endDate",
  draft: createDraft(),
  draftSessionKey: 0,
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
  setDraftSessionKey: mock(),
  setDragStatus: mock(),
  setIsDragging: mock(),
  setIsFormOpen: mock(),
  setIsFormOpenBeforeDragging: mock(),
  setIsResizing: mock(),
  setResizeStatus: mock(),
  ...overrides,
});

const dateCalcs = {} as DateCalcs;

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

const setDraftActivity = (
  activity: Activity_DraftEvent,
  eventType = Categories_Event.TIMED,
) => {
  currentState.events.draft!.status = {
    activity,
    dateToResize: null,
    eventType,
    isDrafting: true,
    isFormOpen: false,
  };
};

const renderDraftActions = (draftOverrides: Partial<Schema_GridEvent>) => {
  const setDraft = mock();
  const { wrapper } = createStoreWrapper(currentState);
  const { result } = renderHook(
    () =>
      useDraftActions(
        createState({
          draft: createDraft(draftOverrides),
        }),
        createSetters({ setDraft }),
        dateCalcs,
        weekProps,
      ),
    { wrapper },
  );

  setDraft.mockClear();

  return { result, setDraft };
};

const expectDraftRange = (
  setDraft: ReturnType<typeof mock>,
  startDate: string,
  endDate: string,
) => {
  const nextDraft = setDraft.mock.calls[0]?.[0] as Schema_GridEvent;

  expect(dayjs(nextDraft.startDate).isSame(startDate)).toBe(true);
  expect(dayjs(nextDraft.endDate).isSame(endDate)).toBe(true);
};

describe("useDraftActions", () => {
  beforeEach(() => {
    const draft = createDraft();
    currentState = createInitialState();
    currentState.events.draft = {
      event: draft,
      status: {
        activity: "eventRightClick",
        dateToResize: null,
        eventType: Categories_Event.TIMED,
        isDrafting: true,
        isFormOpen: false,
      },
    };
    currentState.events.getWeekEvents = {
      error: null,
      isProcessing: false,
      isSuccess: true,
      reason: null,
      value: {
        count: 1,
        data: ["event-1"],
        offset: 0,
        page: 1,
        pageSize: 1,
      },
    };
  });

  it("creates a new event when duplicating an existing week event", async () => {
    const { queryClient, wrapper } = createStoreWrapper(currentState);
    const { result } = renderHook(
      () =>
        useDraftActions(createState(), createSetters(), dateCalcs, weekProps),
      { wrapper },
    );

    act(() => {
      result.current.duplicateEvent();
    });

    await waitFor(() => {
      const created = queryClient
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.state.variables as Schema_Event)
        .find(
          (event) => event._id !== "event-1" && event.title === "Seed event",
        );
      expect(created).toBeDefined();
    });
  });

  it("moves a shortcut-created timed draft by keyboard while preserving duration", () => {
    setDraftActivity("createShortcut");
    const { result, setDraft } = renderDraftActions({
      _id: undefined,
      startDate: "2024-01-16T10:00:00.000Z",
      endDate: "2024-01-16T11:00:00.000Z",
    });

    result.current.repositionDraftByKeyboard("ArrowDown");

    expectDraftRange(
      setDraft,
      "2024-01-16T10:15:00.000Z",
      "2024-01-16T11:15:00.000Z",
    );
  });

  it("moves a mouse-created timed draft by keyboard while preserving duration", () => {
    setDraftActivity("gridClick");
    const { result, setDraft } = renderDraftActions({
      _id: undefined,
      startDate: "2024-01-16T10:00:00.000Z",
      endDate: "2024-01-16T11:00:00.000Z",
    });

    result.current.repositionDraftByKeyboard("ArrowDown");

    expectDraftRange(
      setDraft,
      "2024-01-16T10:15:00.000Z",
      "2024-01-16T11:15:00.000Z",
    );
  });

  it("moves a clicked existing timed event draft by keyboard", () => {
    setDraftActivity("gridClick");
    const { result, setDraft } = renderDraftActions({
      _id: "event-1",
      startDate: "2024-01-16T10:00:00.000Z",
      endDate: "2024-01-16T11:00:00.000Z",
    });

    result.current.repositionDraftByKeyboard("ArrowLeft");

    expectDraftRange(
      setDraft,
      "2024-01-15T10:00:00.000Z",
      "2024-01-15T11:00:00.000Z",
    );
  });

  it("moves a keyboard-opened existing timed event draft by keyboard", () => {
    setDraftActivity("keyboardEdit");
    const { result, setDraft } = renderDraftActions({
      _id: "event-1",
      startDate: "2024-01-16T10:00:00.000Z",
      endDate: "2024-01-16T11:00:00.000Z",
    });

    result.current.repositionDraftByKeyboard("ArrowRight");

    expectDraftRange(
      setDraft,
      "2024-01-17T10:00:00.000Z",
      "2024-01-17T11:00:00.000Z",
    );
  });

  it("does not move a timed draft past midnight", () => {
    setDraftActivity("createShortcut");
    const { result, setDraft } = renderDraftActions({
      _id: undefined,
      startDate: "2024-01-16T23:00:00.000Z",
      endDate: "2024-01-17T00:00:00.000Z",
    });

    result.current.repositionDraftByKeyboard("ArrowDown");

    expect(setDraft).not.toHaveBeenCalled();
  });

  it("moves a clicked existing all-day event draft horizontally and ignores vertical arrows", () => {
    setDraftActivity("gridClick", Categories_Event.ALLDAY);
    const { result, setDraft } = renderDraftActions({
      _id: "event-1",
      isAllDay: true,
      startDate: "2024-01-16T00:00:00.000Z",
      endDate: "2024-01-17T00:00:00.000Z",
    });

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
    const { result, setDraft } = renderDraftActions({
      _id: undefined,
      isAllDay: true,
      startDate: "2024-01-16T00:00:00.000Z",
      endDate: "2024-01-17T00:00:00.000Z",
    });

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
});
