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
});
