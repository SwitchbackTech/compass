import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  seedPendingEventMutations,
  toNormalizedEventQueryData,
} from "@web/__tests__/utils/event-query-test-data";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  DATA_EVENT_ELEMENT_ID,
  ID_EVENT_FORM,
  ID_SIDEBAR,
} from "@web/common/constants/web.constants";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { useDraftStore } from "@web/events/stores/draft.store";
import { initialViewState, useViewStore } from "@web/events/stores/view.store";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const editableEvent = {
  _id: "event-1",
  endDate: "2026-05-20T10:00:00.000Z",
  isAllDay: false,
  startDate: "2026-05-20T09:00:00.000Z",
  title: "Editable event",
};
const editableAllDayEvent = {
  _id: "all-day-event-1",
  endDate: "2026-05-21T00:00:00.000Z",
  isAllDay: true,
  startDate: "2026-05-20T00:00:00.000Z",
  title: "Editable all-day event",
};
let pendingEventIds: string[] = [];
let repositionDraftByKeyboard = mock();

const { useWeekShortcuts } =
  require("./useWeekShortcuts") as typeof import("./useWeekShortcuts");

beforeEach(() => {
  HotkeyManager.resetInstance();
  repositionDraftByKeyboard = mock();
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
  eventId = editableEvent._id,
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
}) => {
  const queryClient = new QueryClient();
  seedPendingEventMutations(queryClient, pendingEventIds);
  const events = [
    ...(options?.includeEditableEvent === false ? [] : [editableEvent]),
    ...(options?.includeAllDayEvent ? [editableAllDayEvent] : []),
  ];
  queryClient.setQueryDefaults(["events"], {
    initialData: toNormalizedEventQueryData(events),
  });
  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <HotkeysProvider>
          <DraftContext.Provider
            value={
              {
                actions: { repositionDraftByKeyboard },
                confirmation: {},
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
    expect(useDraftStore.getState().event?._id).toBe("event-1");
    expect(useDraftStore.getState().event).toHaveProperty("position");
  });

  it("edits the prepared all-day calendar event with M", async () => {
    const button = addCalendarTarget(editableAllDayEvent._id, "all-day");
    button.focus();

    renderShortcuts({ includeAllDayEvent: true });
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe("all-day-event-1");
    expect(useDraftStore.getState().event).toHaveProperty("position");
  });

  it("edits the hovered calendar event with M when no event is focused", async () => {
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe("event-1");
  });

  it("edits pending calendar events with M", async () => {
    pendingEventIds = ["event-1"];
    const button = addCalendarTarget();
    button.focus();

    renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe("event-1");
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
          ids: [editableEvent._id],
          entities: { [editableEvent._id]: editableEvent },
        },
      );
    });
    await waitFor(() => {
      expect(
        queryClient
          .getQueriesData<{ ids: string[] }>({ queryKey: ["events", "week"] })
          .some(([, data]) => data?.ids.includes(editableEvent._id)),
      ).toBe(true);
    });
    pressKey("M");

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    });
    expect(useDraftStore.getState().event?._id).toBe("event-1");
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
    const confirm = mock(() => true);
    window.confirm = confirm;
    const button = addCalendarTarget();
    button.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable event?");
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { _id?: string })._id === "event-1",
        ),
    ).toBe(true);
  });

  it("deletes the focused all-day calendar event with Delete", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    const button = addCalendarTarget(editableAllDayEvent._id, "all-day");
    button.focus();

    const { queryClient } = renderShortcuts({ includeAllDayEvent: true });
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable all-day event?");
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { _id?: string })._id ===
            "all-day-event-1",
        ),
    ).toBe(true);
  });

  it("deletes the hovered calendar event with Delete when no event is focused", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable event?");
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { _id?: string })._id === "event-1",
        ),
    ).toBe(true);
  });

  it("deletes pending calendar events with Delete", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    pendingEventIds = ["event-1"];
    const button = addCalendarTarget();
    button.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable event?");
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            mutation.options.mutationKey?.[2] === "delete" &&
            (mutation.state.variables as { _id?: string })._id === "event-1",
        ),
    ).toBe(true);
  });

  it("does not delete calendar events when Delete is pressed inside an editable field", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    addCalendarTarget();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete", {}, input);

    expect(confirm).not.toHaveBeenCalled();
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.options.mutationKey?.[2] === "delete"),
    ).toBe(false);
  });

  it("does not delete a grid event when Delete is pressed inside an open event form", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    addCalendarTarget();

    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete", {}, button);

    expect(confirm).not.toHaveBeenCalled();
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.options.mutationKey?.[2] === "delete"),
    ).toBe(false);
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

  it("opens the sidebar first when it is closed", async () => {
    useViewStore.setState({ sidebar: { isOpen: false } });
    const { weekItem } = addSidebarFixture({ includeWeekItem: true });

    renderShortcuts();
    pressKey("U");

    await waitFor(() => {
      expect(useViewStore.getState().sidebar.isOpen).toBe(true);
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(weekItem);
    });
  });

  it("does not delete a grid event when Delete is pressed with sidebar focus", async () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    addCalendarTarget();
    const { weekItem } = addSidebarFixture({ includeWeekItem: true });
    weekItem?.focus();

    const { queryClient } = renderShortcuts();
    pressKey("Delete", {}, weekItem ?? document);

    expect(confirm).not.toHaveBeenCalled();
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.options.mutationKey?.[2] === "delete"),
    ).toBe(false);
  });
});
