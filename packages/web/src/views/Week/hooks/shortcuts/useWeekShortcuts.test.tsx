import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  seedPendingEventMutations,
  toNormalizedEventQueryData,
} from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  DATA_EVENT_ELEMENT_ID,
  ID_EVENT_FORM,
  ID_SIDEBAR,
} from "@web/common/constants/web.constants";
import { getOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { useDraftStore } from "@web/events/stores/draft.store";
import { initialViewState, useViewStore } from "@web/events/stores/view.store";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Fixed 24-hex-char ids so fixtures satisfy EventIdSchema (real ObjectId
// shape) while staying stable/readable across assertions.
const EVENT_1_ID = EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa");
const ALL_DAY_EVENT_1_ID = EventIdSchema.parse("bbbbbbbbbbbbbbbbbbbbbbbb");
const LEFTMOST_EVENT_ID = EventIdSchema.parse("665f0c2f8b3e4a1d9c2b7a01");

const editableEvent = createMockEvent({
  id: EVENT_1_ID,
  content: { kind: "details", title: "Editable event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "timed",
    start: "2026-05-20T09:00:00.000Z",
    end: "2026-05-20T10:00:00.000Z",
    timeZone: "UTC",
  }),
});
const editableAllDayEvent = createMockEvent({
  id: ALL_DAY_EVENT_1_ID,
  content: {
    kind: "details",
    title: "Editable all-day event",
    description: "",
  },
  schedule: EventScheduleSchema.parse({
    kind: "allDay",
    start: "2026-05-20",
    end: "2026-05-21",
  }),
});
// Converted someday events are re-validated against SomedayEventSchema, so
// this fixture needs a real ObjectId and the required core fields
const leftmostEvent = createMockEvent({
  id: LEFTMOST_EVENT_ID,
  content: { kind: "details", title: "Leftmost event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "timed",
    start: "2026-05-18T09:00:00.000Z",
    end: "2026-05-18T10:00:00.000Z",
    timeZone: "UTC",
  }),
});
const shiftKey = {
  keyDownInit: { shiftKey: true },
  keyUpInit: { shiftKey: true },
};
let pendingEventIds: string[] = [];
let repositionDraftByKeyboard = mock();
let confirmationOnSubmit = mock();

const { useWeekShortcuts } =
  require("./useWeekShortcuts") as typeof import("./useWeekShortcuts");

beforeEach(() => {
  HotkeyManager.resetInstance();
  repositionDraftByKeyboard = mock();
  confirmationOnSubmit = mock();
});

afterEach(() => {
  clearHoveredCalendarEventTarget();
  cleanup();
  document.body.innerHTML = "";
  pendingEventIds = [];
  weekEventRegistry.clear();
  useViewStore.setState(initialViewState);
});

const addCalendarTarget = (
  eventId = editableEvent.id,
  eventType: "all-day" | "timed" = "timed",
) => {
  const button = document.createElement("button");
  Object.defineProperty(button, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  document.body.appendChild(button);
  weekEventRegistry.register({
    element: button,
    eventId,
    eventType,
  });
  return button;
};

const renderShortcuts = (options?: {
  includeEditableEvent?: boolean;
  includeAllDayEvent?: boolean;
  includeLeftmostEvent?: boolean;
}) => {
  const queryClient = new QueryClient();
  seedPendingEventMutations(queryClient, pendingEventIds);
  const events = [
    ...(options?.includeEditableEvent === false ? [] : [editableEvent]),
    ...(options?.includeAllDayEvent ? [editableAllDayEvent] : []),
    ...(options?.includeLeftmostEvent ? [leftmostEvent] : []),
  ];
  queryClient.setQueryDefaults(["events"], {
    initialData: toNormalizedEventQueryData(events),
  });
  // The someday view model validates every entity; keep its query empty so the
  // minimal grid fixtures above don't fail someday-schema parsing
  queryClient.setQueryDefaults(["events", "someday"], {
    initialData: toNormalizedEventQueryData([]),
  });
  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <HotkeysProvider>
          <DraftContext.Provider
            value={
              {
                actions: { repositionDraftByKeyboard },
                confirmation: { onSubmit: confirmationOnSubmit },
                setters: {},
                state: {},
              } as never
            }
          >
            {children}
          </DraftContext.Provider>
        </HotkeysProvider>
      </QueryClientProvider>
    );
  }

  renderHook(
    () =>
      useWeekShortcuts({
        endOfView: dayjs("2026-05-24T00:00:00.000"),
        isCurrentWeek: true,
        scrollUtil: { scrollToNow: mock() } as never,
        startOfView: dayjs("2026-05-18T00:00:00.000"),
        weekDays: Array.from({ length: 7 }, (_, index) =>
          dayjs("2026-05-18T00:00:00.000").add(index, "day"),
        ),
        util: {
          decrementWeek: mock(),
          getLastNavigationSource: mock(),
          goToToday: mock(),
          incrementWeek: mock(),
        },
      }),
    { wrapper },
  );

  return { queryClient };
};

describe("useWeekShortcuts calendar event targeting", () => {
  it("focuses the first visible calendar event with I", async () => {
    const button = addCalendarTarget();

    renderShortcuts();
    pressKey("I");

    await waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
  });

  it("edits the focused calendar event with M", async () => {
    const button = addCalendarTarget();
    button.focus();

    renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe(EVENT_1_ID);
    // The canonical GridEventDraft must be populated too — this is what
    // lets a subsequent drag continue the keyboard-opened edit (the
    // "M"-then-drag gap this conversion closes).
    const gridDraft = useDraftStore.getState().gridDraft;
    expect(gridDraft?.kind).toBe("edit");
    expect(gridDraft?.kind === "edit" && gridDraft.source.id).toBe(EVENT_1_ID);
  });

  it("edits the prepared all-day calendar event with M", async () => {
    const button = addCalendarTarget(editableAllDayEvent.id, "all-day");
    button.focus();

    renderShortcuts({ includeAllDayEvent: true });
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe(ALL_DAY_EVENT_1_ID);
    const gridDraft = useDraftStore.getState().gridDraft;
    expect(gridDraft?.kind).toBe("edit");
    expect(gridDraft?.kind === "edit" && gridDraft.source.id).toBe(
      ALL_DAY_EVENT_1_ID,
    );
  });

  it("edits the hovered calendar event with M when no event is focused", async () => {
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe(EVENT_1_ID);
  });

  it("edits pending calendar events with M", async () => {
    pendingEventIds = [EVENT_1_ID];
    const button = addCalendarTarget();
    button.focus();

    renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe(EVENT_1_ID);
  });

  it("edits an event loaded after shortcuts are registered", async () => {
    const button = addCalendarTarget();
    button.focus();

    const { queryClient } = renderShortcuts({
      includeEditableEvent: false,
    });
    await act(async () => {
      await queryClient.cancelQueries({ queryKey: ["events", "week"] });
      queryClient.setQueriesData(
        { queryKey: ["events", "week"] },
        {
          ids: [editableEvent.id],
          entities: { [editableEvent.id]: editableEvent },
        },
      );
    });
    await waitFor(() => {
      expect(
        queryClient
          .getQueriesData<{ ids: string[] }>({ queryKey: ["events", "week"] })
          .some(([, data]) => data?.ids.includes(editableEvent.id)),
      ).toBe(true);
    });
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe(EVENT_1_ID);
  });

  it("moves the active shortcut-created draft with arrow keys", () => {
    renderShortcuts();

    pressKey("ArrowRight");

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowRight");
  });

  it("lets editable fields keep normal arrow-key behavior", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderShortcuts();

    pressKey("ArrowRight", {}, input);

    expect(repositionDraftByKeyboard).not.toHaveBeenCalled();
  });

  it("moves the draft when arrow keys are pressed from a non-text event form control", () => {
    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();
    renderShortcuts();

    pressKey("ArrowRight", {}, button);

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowRight");
  });

  it("deletes the focused timed calendar event with Delete", () => {
    const button = addCalendarTarget();
    button.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { id?: string }).id === EVENT_1_ID,
        ),
    ).toBe(true);
  });

  it("deletes the focused all-day calendar event with Delete", () => {
    const button = addCalendarTarget(editableAllDayEvent.id, "all-day");
    button.focus();

    const { queryClient } = renderShortcuts({ includeAllDayEvent: true });
    pressKey("Delete");

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { id?: string }).id ===
            ALL_DAY_EVENT_1_ID,
        ),
    ).toBe(true);
  });

  it("deletes the hovered calendar event with Delete when no event is focused", () => {
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { id?: string }).id === EVENT_1_ID,
        ),
    ).toBe(true);
  });

  it("deletes pending calendar events with Delete", () => {
    pendingEventIds = [EVENT_1_ID];
    const button = addCalendarTarget();
    button.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            mutation.options.mutationKey?.[2] === "delete" &&
            (mutation.state.variables as { id?: string }).id === EVENT_1_ID,
        ),
    ).toBe(true);
  });

  it("does not delete calendar events when Delete is pressed inside an editable field", () => {
    addCalendarTarget();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete", {}, input);

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.options.mutationKey?.[2] === "delete"),
    ).toBe(false);
  });

  it("does not delete a grid event when Delete is pressed inside an open event form", () => {
    addCalendarTarget();

    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete", {}, button);

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.options.mutationKey?.[2] === "delete"),
    ).toBe(false);
  });
});

describe("useWeekShortcuts shift+arrow event moves", () => {
  it("moves the focused timed event to the next day with Shift+ArrowRight", async () => {
    const button = addCalendarTarget();
    button.focus();
    renderShortcuts();

    pressKey("ArrowRight", shiftKey);

    await waitFor(() => {
      expect(confirmationOnSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = confirmationOnSubmit.mock.calls[0]?.[0] as GridEventDraft;
    expect(dayjs(submitted.values.schedule.start).format()).toBe(
      dayjs("2026-05-20T09:00:00.000Z").add(1, "day").format(),
    );
    expect(dayjs(submitted.values.schedule.end).format()).toBe(
      dayjs("2026-05-20T10:00:00.000Z").add(1, "day").format(),
    );
  });

  it("moves the focused timed event by 15 minutes with Shift+ArrowUp and Shift+ArrowDown", async () => {
    const button = addCalendarTarget();
    button.focus();
    renderShortcuts();

    pressKey("ArrowUp", shiftKey);

    await waitFor(() => {
      expect(confirmationOnSubmit).toHaveBeenCalledTimes(1);
    });
    const movedUp = confirmationOnSubmit.mock.calls[0]?.[0] as GridEventDraft;
    expect(dayjs(movedUp.values.schedule.start).format()).toBe(
      dayjs("2026-05-20T09:00:00.000Z").subtract(15, "minutes").format(),
    );

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(confirmationOnSubmit).toHaveBeenCalledTimes(2);
    });
    const movedDown = confirmationOnSubmit.mock.calls[1]?.[0] as GridEventDraft;
    expect(dayjs(movedDown.values.schedule.start).format()).toBe(
      dayjs("2026-05-20T09:00:00.000Z").add(15, "minutes").format(),
    );
  });

  it("converts the focused event to someday with Shift+ArrowLeft on the first visible day", async () => {
    const button = addCalendarTarget(leftmostEvent.id);
    button.focus();

    // The transition mutation writes through the local (IndexedDB)
    // repository, which reads the pre-mutation record independently of the
    // query cache seeded below — mirroring production, where the cache is
    // always populated from the repository.
    await getOfflineDataStore().putEvent({
      version: 2,
      id: leftmostEvent.id,
      event: leftmostEvent,
      isDemo: false,
    });

    const { queryClient } = renderShortcuts({ includeLeftmostEvent: true });
    pressKey("ArrowLeft", shiftKey);

    await waitFor(() => {
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .some(
            (mutation) =>
              mutation.options.mutationKey?.[2] === "transition" &&
              (mutation.state.variables as { input?: { kind?: string } }).input
                ?.kind === "unschedule",
          ),
      ).toBe(true);
    });
    expect(confirmationOnSubmit).not.toHaveBeenCalled();
  });

  it("does not move all-day events with Shift+ArrowUp", () => {
    const button = addCalendarTarget(editableAllDayEvent.id, "all-day");
    button.focus();

    renderShortcuts({ includeAllDayEvent: true });
    pressKey("ArrowUp", shiftKey);

    expect(confirmationOnSubmit).not.toHaveBeenCalled();
  });

  it("keeps native Shift+Arrow behavior inside editable fields", () => {
    addCalendarTarget();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderShortcuts();
    pressKey("ArrowRight", shiftKey, input);

    expect(confirmationOnSubmit).not.toHaveBeenCalled();
  });

  it("does not move hovered-but-unfocused events", () => {
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    renderShortcuts();
    pressKey("ArrowRight", shiftKey);

    expect(confirmationOnSubmit).not.toHaveBeenCalled();
  });
});

const addSidebarFixture = (options?: {
  includeWeekItem?: boolean;
  includeMonthItem?: boolean;
}) => {
  const sidebar = document.createElement("aside");
  sidebar.id = ID_SIDEBAR;

  const buildItem = () => {
    const item = document.createElement("div");
    item.setAttribute("role", "button");
    item.setAttribute(DATA_EVENT_ELEMENT_ID, "someday-1");
    item.tabIndex = 0;
    return item;
  };

  const weekColumn = document.createElement("div");
  weekColumn.id = COLUMN_WEEK;
  const weekItem = options?.includeWeekItem ? buildItem() : null;
  if (weekItem) weekColumn.appendChild(weekItem);
  sidebar.appendChild(weekColumn);

  const monthColumn = document.createElement("div");
  monthColumn.id = COLUMN_MONTH;
  const monthItem = options?.includeMonthItem ? buildItem() : null;
  if (monthItem) monthColumn.appendChild(monthItem);
  sidebar.appendChild(monthColumn);

  const addButton = document.createElement("button");
  addButton.setAttribute("aria-label", "Add item to week");
  sidebar.appendChild(addButton);

  document.body.appendChild(sidebar);
  return { addButton, monthItem, sidebar, weekItem };
};

describe("useWeekShortcuts sidebar focus", () => {
  it("focuses the first week someday event with U", async () => {
    const { weekItem, monthItem } = addSidebarFixture({
      includeWeekItem: true,
      includeMonthItem: true,
    });

    renderShortcuts();
    pressKey("U");

    await waitFor(() => {
      expect(document.activeElement).toBe(weekItem);
    });
    expect(document.activeElement).not.toBe(monthItem);
  });

  it("falls back to the month someday event when the week list is empty", async () => {
    const { monthItem } = addSidebarFixture({ includeMonthItem: true });

    renderShortcuts();
    pressKey("U");

    await waitFor(() => {
      expect(document.activeElement).toBe(monthItem);
    });
  });

  it("falls back to the add button when there are no someday events", async () => {
    const { addButton } = addSidebarFixture();

    renderShortcuts();
    pressKey("U");

    await waitFor(() => {
      expect(document.activeElement).toBe(addButton);
    });
  });

  it("does not delete a grid event when Delete is pressed with sidebar focus", async () => {
    addCalendarTarget();
    const { weekItem } = addSidebarFixture({ includeWeekItem: true });
    weekItem?.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete", {}, weekItem ?? document);

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.options.mutationKey?.[2] === "delete"),
    ).toBe(false);
  });
});
