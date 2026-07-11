import { renderHook, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { getOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { useDraftStore } from "@web/events/stores/draft.store";
import { type Setters_Sidebar, type State_Sidebar } from "./useSidebarState";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let currentState = createInitialState();

const { useSidebarActions } =
  require("./useSidebarActions") as typeof import("./useSidebarActions");

const SOMEDAY_EVENT_ID = "664e21f9a6b3f0b1c2d3e4f5";

// draft.store.ts still holds the legacy Schema_Event shape (see its own
// TODO); `somedayEvent` seeds that, while `somedayEventContract` (below)
// seeds the strict-contract `Event` sidebar cache/query and the local
// repository the transition mutation reads through.
const somedayEvent: Schema_Event = {
  _id: SOMEDAY_EVENT_ID,
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

const somedayEventContract = createMockEvent({
  id: EventIdSchema.parse(SOMEDAY_EVENT_ID),
  content: { kind: "details", title: "Someday event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "someday",
    period: "week",
    anchorDate: "2024-01-15",
    sortOrder: 0,
  }),
});

const createState = (): State_Sidebar =>
  ({
    blockedSomedayDropColumn: null,
    draft: somedayEventContract,
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
        [somedayEvent._id!]: somedayEventContract,
      },
    },
    somedayIds: [somedayEvent._id!],
    somedayMonthIds: [],
    somedayWeekIds: [somedayEvent._id!],
  }) as State_Sidebar;

const SECOND_SOMEDAY_EVENT_ID = "664e21f9a6b3f0b1c2d3e4f6";

const secondSomedayEventContract = createMockEvent({
  id: EventIdSchema.parse(SECOND_SOMEDAY_EVENT_ID),
  content: { kind: "details", title: "Second someday event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "someday",
    period: "week",
    anchorDate: "2024-01-15",
    sortOrder: 1,
  }),
});

const createTwoEventWeekState = (): State_Sidebar =>
  ({
    blockedSomedayDropColumn: null,
    draft: null,
    isDrafting: false,
    isDraftingExisting: false,
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
          eventIds: [somedayEvent._id!, SECOND_SOMEDAY_EVENT_ID],
        },
      },
      events: {
        [somedayEvent._id!]: somedayEventContract,
        [SECOND_SOMEDAY_EVENT_ID]: secondSomedayEventContract,
      },
    },
    somedayIds: [somedayEvent._id!, SECOND_SOMEDAY_EVENT_ID],
    somedayMonthIds: [],
    somedayWeekIds: [somedayEvent._id!, SECOND_SOMEDAY_EVENT_ID],
  }) as State_Sidebar;

const THIRD_SOMEDAY_EVENT_ID = "664e21f9a6b3f0b1c2d3e4f7";

const thirdSomedayEventContract = createMockEvent({
  id: EventIdSchema.parse(THIRD_SOMEDAY_EVENT_ID),
  content: { kind: "details", title: "Third someday event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "someday",
    period: "month",
    anchorDate: "2024-01-01",
    sortOrder: 0,
  }),
});

const createCrossColumnState = (): State_Sidebar =>
  ({
    blockedSomedayDropColumn: null,
    draft: null,
    isDrafting: false,
    isDraftingExisting: false,
    isDraftingNew: false,
    isDragging: true,
    isSomedayFormOpen: false,
    somedayEvents: {
      columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
      columns: {
        [COLUMN_MONTH]: {
          id: COLUMN_MONTH,
          eventIds: [THIRD_SOMEDAY_EVENT_ID],
        },
        [COLUMN_WEEK]: {
          id: COLUMN_WEEK,
          eventIds: [somedayEvent._id!, SECOND_SOMEDAY_EVENT_ID],
        },
      },
      events: {
        [somedayEvent._id!]: somedayEventContract,
        [SECOND_SOMEDAY_EVENT_ID]: secondSomedayEventContract,
        [THIRD_SOMEDAY_EVENT_ID]: thirdSomedayEventContract,
      },
    },
    somedayIds: [
      somedayEvent._id!,
      SECOND_SOMEDAY_EVENT_ID,
      THIRD_SOMEDAY_EVENT_ID,
    ],
    somedayMonthIds: [THIRD_SOMEDAY_EVENT_ID],
    somedayWeekIds: [somedayEvent._id!, SECOND_SOMEDAY_EVENT_ID],
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
    // The transition mutation writes through the local (IndexedDB)
    // repository, which reads the pre-mutation record independently of the
    // query cache seeded below — mirroring production, where the cache is
    // always populated from the repository.
    await getOfflineDataStore().putEvent({
      version: 2,
      id: somedayEventContract.id,
      event: somedayEventContract,
      isDemo: false,
    });

    const { queryClient, wrapper } = createStoreWrapper(currentState, {
      events: [somedayEventContract],
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

    // The default target calendar resolves from the (async, though
    // synchronous-in-practice for anon mode) calendars query; wait for it so
    // commitSomedayInteraction doesn't race an undefined calendar list.
    await waitFor(() => {
      expect(queryClient.getQueryData(["calendars"])).toBeDefined();
    });

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
              mutation.options.mutationKey?.[2] === "transition" &&
              (
                mutation.state.variables as {
                  id?: string;
                  input?: { kind?: string };
                }
              ).id === SOMEDAY_EVENT_ID &&
              (
                mutation.state.variables as {
                  input?: { kind?: string };
                }
              ).input?.kind === "schedule",
          ),
      ).toBe(true);
    });
    // Scheduling a someday drop must not start a grid draft.
    expect(useDraftStore.getState().status?.isDrafting).toBe(false);
  });

  it("reorders within the same someday column via the strict reorderSomeday mutation", async () => {
    await getOfflineDataStore().putEvent({
      version: 2,
      id: somedayEventContract.id,
      event: somedayEventContract,
      isDemo: false,
    });
    await getOfflineDataStore().putEvent({
      version: 2,
      id: secondSomedayEventContract.id,
      event: secondSomedayEventContract,
      isDemo: false,
    });

    const state = createTwoEventWeekState();
    const { queryClient, wrapper } = createStoreWrapper(currentState, {
      events: [somedayEventContract, secondSomedayEventContract],
    });
    const setSomedayEvents = mock();
    const setters = { ...createSetters(), setSomedayEvents };

    const { result } = renderHook(
      () =>
        useSidebarActions(
          {
            onGoToDate: mock(),
            viewEnd: dayjs("2024-01-21"),
            viewStart: dayjs("2024-01-15"),
          },
          state,
          setters,
        ),
      { wrapper },
    );

    await waitFor(() => {
      expect(queryClient.getQueryData(["calendars"])).toBeDefined();
    });

    // Swap the two week-column events: second event moves from index 1 to 0.
    result.current.commitSomedayInteraction({
      destination: { droppableId: COLUMN_WEEK, index: 0 },
      eventId: SECOND_SOMEDAY_EVENT_ID,
      source: { droppableId: COLUMN_WEEK, index: 1 },
      type: "sidebarDrop",
    });

    await waitFor(() => {
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .some((mutation) => {
            if (mutation.options.mutationKey?.[2] !== "reorder-someday") {
              return false;
            }
            const input = mutation.state.variables as {
              period?: string;
              items?: { eventId: string; sortOrder: number }[];
            };
            return (
              input.period === "week" &&
              input.items?.[0]?.eventId === SECOND_SOMEDAY_EVENT_ID &&
              input.items?.[0]?.sortOrder === 0 &&
              input.items?.[1]?.eventId === SOMEDAY_EVENT_ID &&
              input.items?.[1]?.sortOrder === 1
            );
          }),
      ).toBe(true);
    });

    // Local optimistic reorder is applied before the mutation fires.
    expect(setSomedayEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.objectContaining({
          [COLUMN_WEEK]: expect.objectContaining({
            eventIds: [SECOND_SOMEDAY_EVENT_ID, SOMEDAY_EVENT_ID],
          }),
        }),
      }),
    );
  });

  it("moves a Someday event across columns via reorderSomeday + replace mutations", async () => {
    await getOfflineDataStore().putEvent({
      version: 2,
      id: somedayEventContract.id,
      event: somedayEventContract,
      isDemo: false,
    });
    await getOfflineDataStore().putEvent({
      version: 2,
      id: secondSomedayEventContract.id,
      event: secondSomedayEventContract,
      isDemo: false,
    });
    await getOfflineDataStore().putEvent({
      version: 2,
      id: thirdSomedayEventContract.id,
      event: thirdSomedayEventContract,
      isDemo: false,
    });

    const state = createCrossColumnState();
    const { queryClient, wrapper } = createStoreWrapper(currentState, {
      events: [
        somedayEventContract,
        secondSomedayEventContract,
        thirdSomedayEventContract,
      ],
    });
    const setSomedayEvents = mock();
    const setters = { ...createSetters(), setSomedayEvents };

    const { result } = renderHook(
      () =>
        useSidebarActions(
          {
            onGoToDate: mock(),
            viewEnd: dayjs("2024-01-21"),
            viewStart: dayjs("2024-01-15"),
          },
          state,
          setters,
        ),
      { wrapper },
    );

    await waitFor(() => {
      expect(queryClient.getQueryData(["calendars"])).toBeDefined();
    });

    // Move the first week event into the month column, ahead of the
    // existing month event.
    result.current.commitSomedayInteraction({
      destination: { droppableId: COLUMN_MONTH, index: 0 },
      eventId: SOMEDAY_EVENT_ID,
      source: { droppableId: COLUMN_WEEK, index: 0 },
      type: "sidebarDrop",
    });

    await waitFor(() => {
      const mutations = queryClient.getMutationCache().getAll();

      // The dragged event's own period/sortOrder move via `replace`.
      const replaced = mutations.some((mutation) => {
        if (mutation.options.mutationKey?.[2] !== "replace") return false;
        const variables = mutation.state.variables as {
          id?: string;
          input?: { schedule?: { period?: string; sortOrder?: number } };
        };
        return (
          variables.id === SOMEDAY_EVENT_ID &&
          variables.input?.schedule?.period === "month" &&
          variables.input?.schedule?.sortOrder === 0
        );
      });

      // The remaining week-column sibling is reordered under "week".
      const weekReordered = mutations.some((mutation) => {
        if (mutation.options.mutationKey?.[2] !== "reorder-someday") {
          return false;
        }
        const input = mutation.state.variables as {
          period?: string;
          items?: { eventId: string; sortOrder: number }[];
        };
        return (
          input.period === "week" &&
          input.items?.length === 1 &&
          input.items?.[0]?.eventId === SECOND_SOMEDAY_EVENT_ID &&
          input.items?.[0]?.sortOrder === 0
        );
      });

      // The existing month-column sibling is reordered under "month",
      // without the dragged event mixed in (it moved via `replace` above).
      const monthReordered = mutations.some((mutation) => {
        if (mutation.options.mutationKey?.[2] !== "reorder-someday") {
          return false;
        }
        const input = mutation.state.variables as {
          period?: string;
          items?: { eventId: string; sortOrder: number }[];
        };
        return (
          input.period === "month" &&
          input.items?.length === 1 &&
          input.items?.[0]?.eventId === THIRD_SOMEDAY_EVENT_ID &&
          input.items?.[0]?.sortOrder === 1
        );
      });

      expect(replaced).toBe(true);
      expect(weekReordered).toBe(true);
      expect(monthReordered).toBe(true);
    });

    // Local optimistic move is applied before the mutations fire.
    expect(setSomedayEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.objectContaining({
          [COLUMN_WEEK]: expect.objectContaining({
            eventIds: [SECOND_SOMEDAY_EVENT_ID],
          }),
          [COLUMN_MONTH]: expect.objectContaining({
            eventIds: [SOMEDAY_EVENT_ID, THIRD_SOMEDAY_EVENT_ID],
          }),
        }),
      }),
    );
  });
});
