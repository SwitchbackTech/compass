import { renderHook } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  createInitialState,
  type InitialReduxState,
} from "@web/__tests__/utils/state/store.test.util";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { type Setters_Sidebar, type State_Sidebar } from "./useSidebarState";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

let currentState: InitialReduxState = createInitialState();

const { useSidebarActions } =
  require("./useSidebarActions") as typeof import("./useSidebarActions");

const somedayEvent: Schema_Event = {
  _id: "664e21f9a6b3f0b1c2d3e4f5",
  endDate: "2024-01-21",
  isAllDay: false,
  isSomeday: true,
  origin: Origin.COMPASS,
  order: 0,
  priority: Priorities.UNASSIGNED,
  startDate: "2024-01-15",
  title: "Someday event",
  user: "user-1",
};

const createState = (): State_Sidebar =>
  ({
    blockedSomedayDropColumn: null,
    draft: somedayEvent,
    isCalendarDragActive: false,
    isDrafting: true,
    isDraftingExisting: true,
    isDraftingNew: false,
    isDragging: true,
    isSomedayFormOpen: false,
    somedayEvents: {
      columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
      columns: {
        [COLUMN_MONTH]: {
          id: COLUMN_MONTH,
          eventIds: [],
        },
        [COLUMN_WEEK]: {
          id: COLUMN_WEEK,
          eventIds: [somedayEvent._id!],
        },
      },
      events: {
        [somedayEvent._id!]: somedayEvent,
      },
    },
    somedayIds: [somedayEvent._id!],
    somedayMonthIds: [],
    somedayWeekIds: [somedayEvent._id!],
  }) as State_Sidebar;

const createSetters = (): Setters_Sidebar =>
  ({
    setBlockedSomedayDropColumn: mock(),
    setDraft: mock(),
    setIsCalendarDragActive: mock(),
    setIsDrafting: mock(),
    setIsDraftingExisting: mock(),
    setIsSomedayFormOpen: mock(),
    setSomedayEvents: mock(),
  }) as unknown as Setters_Sidebar;

describe("useSidebarActions", () => {
  beforeEach(() => {
    currentState = createInitialState();
    currentState.events.entities!.value = {
      [somedayEvent._id!]: somedayEvent,
    };
    currentState.events.getSomedayEvents = {
      error: null,
      isProcessing: false,
      isSuccess: true,
      reason: null,
      value: {
        count: 1,
        data: [somedayEvent._id!],
        offset: 0,
        page: 1,
        pageSize: 1,
      },
    };
  });

  it("schedules a dropped Someday event immediately", () => {
    const { store, wrapper } = createStoreWrapper(currentState);
    const dispatchSpy = spyOn(store, "dispatch");
    const { result } = renderHook(
      () =>
        useSidebarActions(
          {
            onGoToDate: mock(),
            viewEnd: dayjs("2024-01-21"),
            viewStart: dayjs("2024-01-15"),
          },
          createState(),
          createSetters(),
        ),
      { wrapper },
    );

    result.current.commitSomedayInteraction({
      dates: {
        endDate: "2024-01-16T12:00:00.000Z",
        startDate: "2024-01-16T11:00:00.000Z",
      },
      eventId: somedayEvent._id!,
      isAllDay: false,
      type: "schedule",
    });

    const convertAction = dispatchSpy.mock.calls.find(
      ([action]) => action.type === getSomedayEventsSlice.actionNames.convert,
    )?.[0];
    const draftStartAction = dispatchSpy.mock.calls.find(
      ([action]) => action.type === draftSlice.actions.start.type,
    )?.[0];

    if (!convertAction) {
      throw new Error("Expected someday convert action to be dispatched");
    }

    expect(convertAction.payload.event).toEqual({
      _id: somedayEvent._id,
      endDate: "2024-01-16T12:00:00.000Z",
      isAllDay: false,
      isSomeday: false,
      startDate: "2024-01-16T11:00:00.000Z",
    });
    expect(draftStartAction).toBeUndefined();
  });

  const renderActions = (setters: Setters_Sidebar) => {
    const { wrapper } = createStoreWrapper(currentState);

    return renderHook(
      () =>
        useSidebarActions(
          {
            onGoToDate: mock(),
            viewEnd: dayjs("2024-01-21"),
            viewStart: dayjs("2024-01-15"),
          },
          createState(),
          setters,
        ),
      { wrapper },
    );
  };

  const placeholderEvent: Schema_Event = {
    ...somedayEvent,
    _id: "grid-event-1",
    title: "Grid event",
  };

  it("inserts a placeholder row while a calendar event is previewed over the sidebar", () => {
    const setters = createSetters();
    const { result } = renderActions(setters);

    result.current.setCalendarSidebarDropPreview({
      column: COLUMN_WEEK,
      event: placeholderEvent,
      index: 0,
      isBlocked: false,
    });

    expect(setters.setIsCalendarDragActive).toHaveBeenCalledWith(true);
    expect(setters.setBlockedSomedayDropColumn).toHaveBeenLastCalledWith(null);

    const previewState = (
      setters.setSomedayEvents as ReturnType<typeof mock>
    ).mock.calls.at(-1)?.[0] as State_Sidebar["somedayEvents"];

    expect(previewState.columns[COLUMN_WEEK].eventIds).toEqual([
      "grid-event-1",
      somedayEvent._id!,
    ]);
    expect(previewState.events["grid-event-1"]).toBeTruthy();
  });

  it("marks the column blocked without inserting a placeholder when full", () => {
    const setters = createSetters();
    const { result } = renderActions(setters);

    result.current.setCalendarSidebarDropPreview({
      column: COLUMN_WEEK,
      event: placeholderEvent,
      index: 0,
      isBlocked: true,
    });

    expect(setters.setIsCalendarDragActive).toHaveBeenCalledWith(true);
    expect(setters.setBlockedSomedayDropColumn).toHaveBeenLastCalledWith(
      COLUMN_WEEK,
    );
    expect(setters.setSomedayEvents).not.toHaveBeenCalled();
  });

  it("restores the list and clears the flags when the preview ends", () => {
    const setters = createSetters();
    const { result } = renderActions(setters);

    result.current.setCalendarSidebarDropPreview({
      column: COLUMN_WEEK,
      event: placeholderEvent,
      index: 0,
      isBlocked: false,
    });
    result.current.setCalendarSidebarDropPreview(null);

    const restoredState = (
      setters.setSomedayEvents as ReturnType<typeof mock>
    ).mock.calls.at(-1)?.[0] as State_Sidebar["somedayEvents"];

    // Restores the original snapshot (no placeholder).
    expect(restoredState.columns[COLUMN_WEEK].eventIds).toEqual([
      somedayEvent._id!,
    ]);
    expect(setters.setIsCalendarDragActive).toHaveBeenLastCalledWith(false);
    expect(setters.setBlockedSomedayDropColumn).toHaveBeenLastCalledWith(null);
  });
});
