import { renderHook } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  createInitialState,
  type InitialReduxState,
} from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import {
  type Setters_Draft,
  type State_Draft_Local,
} from "@web/views/Calendar/components/Draft/hooks/state/useDraftState";
import { type DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { getDragDurationMinutes } from "./drag-duration.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockDispatch = mock();
let currentState: InitialReduxState = createInitialState();

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: InitialReduxState) => unknown) =>
    selector(currentState),
}));

mock.module(
  "@web/views/Calendar/components/Draft/hooks/effects/useDraftEffects",
  () => ({
    useDraftEffects: mock(),
  }),
);

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
    mockDispatch.mockClear();
  });

  it("creates a new event when duplicating an existing week event", () => {
    const { result } = renderHook(() =>
      useDraftActions(createState(), createSetters(), dateCalcs, weekProps),
    );

    result.current.duplicateEvent();

    const createAction = mockDispatch.mock.calls.find(
      ([action]) => action.type === createEventSlice.actionNames.request,
    )?.[0];

    expect(createAction).toBeDefined();
    expect(createAction.payload._id).not.toBe("event-1");
    expect(createAction.payload.title).toBe("Seed event");
  });
});
