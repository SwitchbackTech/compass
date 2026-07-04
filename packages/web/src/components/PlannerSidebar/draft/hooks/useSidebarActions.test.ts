import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useDraftStore } from "@web/events/stores/draft.store";
import { type Setters_Sidebar, type State_Sidebar } from "./useSidebarState";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let currentState = createInitialState();

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
  });

  it("schedules a dropped Someday event immediately", async () => {
    const { queryClient, wrapper } = createStoreWrapper(currentState, {
      events: [somedayEvent],
    });
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

    await waitFor(() => {
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .some(
            (mutation) =>
              mutation.options.mutationKey?.[2] === "convert-to-calendar" &&
              (mutation.state.variables as { event?: { _id?: string } }).event
                ?._id === somedayEvent._id,
          ),
      ).toBe(true);
    });
    // Scheduling a someday drop must not start a grid draft.
    expect(useDraftStore.getState().status?.isDrafting).toBe(false);
  });
});
