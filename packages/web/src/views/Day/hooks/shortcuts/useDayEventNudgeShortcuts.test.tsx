import { HotkeyManager } from "@tanstack/react-hotkeys";
import { act } from "@testing-library/react";
import { Origin } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  cleanup,
  renderHook,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { toNormalizedEventQueryData } from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { createCompassQueryClient } from "@web/api/query-client";
import { ID_EVENT_FORM, ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { dayEventRegistry } from "@web/views/Day/interaction/registry/day-event.registry";
import { useDayEventNudgeShortcuts } from "./useDayEventNudgeShortcuts";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const TIMED_EVENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const LATER_TIMED_EVENT_ID = "cccccccccccccccccccccccc";
const ALL_DAY_EVENT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

const timedEvent: GridEvent = {
  _id: TIMED_EVENT_ID,
  endDate: "2026-05-20T10:00:00.000",
  isAllDay: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  startDate: "2026-05-20T09:00:00.000",
  title: "Timed event",
  user: "user-1",
};

const laterTimedEvent: GridEvent = {
  ...timedEvent,
  _id: LATER_TIMED_EVENT_ID,
  startDate: "2026-05-20T11:00:00.000",
  endDate: "2026-05-20T12:00:00.000",
  title: "Later event",
};

const allDayEvent: GridEvent = {
  _id: ALL_DAY_EVENT_ID,
  endDate: "2026-05-21",
  isAllDay: true,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  startDate: "2026-05-20",
  title: "All-day event",
  user: "user-1",
};

const timedEventContract = createMockEvent({
  id: EventIdSchema.parse(TIMED_EVENT_ID),
  content: { kind: "details", title: "Timed event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "timed",
    start: "2026-05-20T09:00:00.000Z",
    end: "2026-05-20T10:00:00.000Z",
    timeZone: "UTC",
  }),
});

const allDayEventContract = createMockEvent({
  id: EventIdSchema.parse(ALL_DAY_EVENT_ID),
  content: { kind: "details", title: "All-day event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "allDay",
    start: "2026-05-20",
    end: "2026-05-21",
  }),
});

const shiftKey = {
  keyDownInit: { shiftKey: true },
  keyUpInit: { shiftKey: true },
};

const focusCalendarTarget = (
  eventId: string,
  eventType: "all-day" | "timed",
) => {
  const button = document.createElement("button");
  Object.defineProperty(button, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  document.body.appendChild(button);
  dayEventRegistry.register({
    element: button,
    eventId,
    eventType,
  });
  button.focus();
  return button;
};

const renderEditShortcuts = ({
  allDayEvents = [],
  navigateToDate,
  timedEvents = [timedEvent],
}: {
  allDayEvents?: GridEvent[];
  navigateToDate?: (date: Dayjs) => void;
  timedEvents?: GridEvent[];
} = {}) => {
  const queryClient = createCompassQueryClient();
  const contracts = [timedEventContract];
  if (allDayEvents.some((event) => event._id === ALL_DAY_EVENT_ID)) {
    contracts.push(allDayEventContract);
  }
  queryClient.setQueryData(
    eventQueryKeys.day({
      source: "local",
      start: "2026-05-20T00:00:00.000Z",
      end: "2026-05-21T00:00:00.000Z",
    }),
    toNormalizedEventQueryData(contracts),
  );
  const repository: EventRepository = {
    list: async () => [],
    create: async () => timedEventContract,
    replace: async (id, input) => ({
      ...(id === ALL_DAY_EVENT_ID ? allDayEventContract : timedEventContract),
      id,
      content: input.content,
      schedule: input.schedule,
    }),
    delete: async () => {},
  };
  const dependencies = {
    source: "local" as const,
    repository,
    markWrite: async () => {},
    reportError: () => {},
  };
  renderHook(
    () =>
      useDayEventNudgeShortcuts({
        allDayEvents,
        dependencies,
        navigateToDate,
        timedEvents,
      }),
    {
      events: contracts,
      queryClient,
    },
  );
  return { queryClient };
};

const offsetString = (date: Dayjs) =>
  dayjs.tz(date.toDate(), getBrowserTimeZone()).format();

const getEditMutation = (
  queryClient: ReturnType<typeof createCompassQueryClient>,
) =>
  queryClient
    .getMutationCache()
    .getAll()
    .find((mutation) => mutation.options.mutationKey?.[2] === "replace");

const getDeleteMutation = (
  queryClient: ReturnType<typeof createCompassQueryClient>,
) =>
  queryClient
    .getMutationCache()
    .getAll()
    .find((mutation) => mutation.options.mutationKey?.[2] === "delete");

beforeEach(() => {
  HotkeyManager.resetInstance();
  draftActions.discard();
});

afterEach(() => {
  cleanup();
  dayEventRegistry.clear();
  draftActions.discard();
  document.body.innerHTML = "";
});

describe("useDayEventNudgeShortcuts", () => {
  it("moves the focused timed event 15 minutes earlier with Shift+ArrowUp", async () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const { queryClient } = renderEditShortcuts();

    pressKey("ArrowUp", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string; end: string } };
    };
    expect(input.schedule.start).toBe(
      offsetString(dayjs(timedEvent.startDate).subtract(15, "minutes")),
    );
    expect(input.schedule.end).toBe(
      offsetString(dayjs(timedEvent.endDate).subtract(15, "minutes")),
    );
  });

  it("moves the focused timed event 15 minutes later with Shift+ArrowDown", async () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const { queryClient } = renderEditShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string } };
    };
    expect(input.schedule.start).toBe(
      offsetString(dayjs(timedEvent.startDate).add(15, "minutes")),
    );
  });

  it("moves the focused timed event to the next day with Shift+ArrowRight", async () => {
    const navigateToDate = mock(() => {});
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const { queryClient } = renderEditShortcuts({ navigateToDate });

    pressKey("ArrowRight", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string } };
    };
    expect(input.schedule.start).toBe(
      offsetString(dayjs(timedEvent.startDate).add(1, "day")),
    );
    expect(navigateToDate).toHaveBeenCalled();
  });

  it("moves the focused all-day event to the previous day with Shift+ArrowLeft", async () => {
    focusCalendarTarget(ALL_DAY_EVENT_ID, "all-day");
    const { queryClient } = renderEditShortcuts({
      allDayEvents: [allDayEvent],
      timedEvents: [],
    });

    pressKey("ArrowLeft", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string; end: string } };
    };
    expect(input.schedule.start).toBe("2026-05-19");
    expect(input.schedule.end).toBe("2026-05-20");
  });

  it("does not move all-day events with Shift+ArrowUp", async () => {
    focusCalendarTarget(ALL_DAY_EVENT_ID, "all-day");
    const { queryClient } = renderEditShortcuts({
      allDayEvents: [allDayEvent],
      timedEvents: [],
    });

    pressKey("ArrowUp", shiftKey);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("does not move anything when no event is focused", async () => {
    const { queryClient } = renderEditShortcuts();

    pressKey("ArrowUp", shiftKey);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("deletes the focused timed calendar event with Delete", () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const { queryClient } = renderEditShortcuts();

    pressKey("Delete");

    expect(
      (getDeleteMutation(queryClient)?.state.variables as { id?: string })?.id,
    ).toBe(TIMED_EVENT_ID);
  });

  it("does not delete a calendar event with Delete when nothing is focused", () => {
    const button = focusCalendarTarget(TIMED_EVENT_ID, "timed");
    button.blur();
    const { queryClient } = renderEditShortcuts();

    pressKey("Delete");

    expect(getDeleteMutation(queryClient)).toBeUndefined();
  });

  it("duplicates the focused calendar event with Mod+D", () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    renderEditShortcuts();

    pressKey("d", {
      keyDownInit: { ctrlKey: true },
      keyUpInit: { ctrlKey: true },
    });

    const state = useDraftStore.getState();
    expect(state.status?.isFormOpen).toBe(true);
    expect(state.gridDraft?.kind).toBe("create");
    expect(state.gridDraft?.values.title).toBe("Timed event");
  });

  it("focuses the chronologically next event with ArrowDown", () => {
    const earlier = focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const later = focusCalendarTarget(LATER_TIMED_EVENT_ID, "timed");
    earlier.focus();
    renderEditShortcuts({ timedEvents: [timedEvent, laterTimedEvent] });

    pressKey("ArrowDown");

    expect(document.activeElement).toBe(later);
  });

  it("focuses the chronologically next event with ArrowRight", () => {
    const earlier = focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const later = focusCalendarTarget(LATER_TIMED_EVENT_ID, "timed");
    earlier.focus();
    const navigateToDate = mock(() => {});
    renderEditShortcuts({
      navigateToDate,
      timedEvents: [timedEvent, laterTimedEvent],
    });

    pressKey("ArrowRight");

    expect(document.activeElement).toBe(later);
    expect(navigateToDate).not.toHaveBeenCalled();
  });

  it("focuses the chronologically previous event with ArrowLeft", () => {
    const earlier = focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const later = focusCalendarTarget(LATER_TIMED_EVENT_ID, "timed");
    later.focus();
    const navigateToDate = mock(() => {});
    renderEditShortcuts({
      navigateToDate,
      timedEvents: [timedEvent, laterTimedEvent],
    });

    pressKey("ArrowLeft");

    expect(document.activeElement).toBe(earlier);
    expect(navigateToDate).not.toHaveBeenCalled();
  });

  it("does not change focus with ArrowRight when nothing is focused", () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed").blur();
    focusCalendarTarget(LATER_TIMED_EVENT_ID, "timed").blur();
    const navigateToDate = mock(() => {});
    renderEditShortcuts({
      navigateToDate,
      timedEvents: [timedEvent, laterTimedEvent],
    });

    pressKey("ArrowRight");

    expect(navigateToDate).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBeInstanceOf(HTMLButtonElement);
  });

  it("does not delete a grid event when Delete is pressed inside an open event form", () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();
    const { queryClient } = renderEditShortcuts();

    pressKey("Delete", {}, button);

    expect(getDeleteMutation(queryClient)).toBeUndefined();
  });

  it("does not delete a grid event when Delete is pressed with sidebar focus", () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    const sidebar = document.createElement("div");
    sidebar.id = ID_SIDEBAR;
    const button = document.createElement("button");
    sidebar.appendChild(button);
    document.body.appendChild(sidebar);
    button.focus();
    const { queryClient } = renderEditShortcuts();

    pressKey("Delete", {}, button);

    expect(getDeleteMutation(queryClient)).toBeUndefined();
  });

  it("moves the active shortcut-created draft with arrow keys", () => {
    const navigateToDate = mock(() => {});
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );
    draftActions.startGridDraft({ activity: "createShortcut", draft });
    renderEditShortcuts({ navigateToDate });

    act(() => {
      pressKey("ArrowRight");
    });

    const nextDraft = useDraftStore.getState().gridDraft;
    expect(dayjs(nextDraft?.values.schedule.start).format()).toBe(
      dayjs("2026-05-21T09:00:00.000").format(),
    );
    expect(navigateToDate).toHaveBeenCalled();
  });

  it("lets editable fields keep normal arrow-key behavior", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );
    draftActions.startGridDraft({ activity: "createShortcut", draft });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderEditShortcuts();

    act(() => {
      pressKey("ArrowRight", {}, input);
    });

    expect(
      dayjs(useDraftStore.getState().gridDraft?.values.schedule.start).format(),
    ).toBe(dayjs("2026-05-20T09:00:00.000").format());
  });

  it("opens the focused event form and focuses the title on e then t", async () => {
    focusCalendarTarget(TIMED_EVENT_ID, "timed");
    renderEditShortcuts();

    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const title = document.createElement("input");
    title.name = "Event Title";
    form.appendChild(title);
    document.body.appendChild(form);

    act(() => {
      pressKey("e");
      pressKey("t");
    });

    await waitFor(() => {
      expect(useDraftStore.getState().status?.isFormOpen).toBe(true);
    });
    expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    expect(useDraftStore.getState().gridDraft?.kind).toBe("edit");

    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    });

    expect(document.activeElement).toBe(title);
  });

  it("does nothing on e then t when no event is focused", () => {
    renderEditShortcuts();

    act(() => {
      pressKey("e");
      pressKey("t");
    });

    expect(useDraftStore.getState().status?.isFormOpen).toBeFalsy();
    expect(useDraftStore.getState().gridDraft).toBeNull();
  });
});
