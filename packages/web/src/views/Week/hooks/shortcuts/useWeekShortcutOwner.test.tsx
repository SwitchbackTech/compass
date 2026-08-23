import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema, EventIdSchema } from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  seedPendingEventMutations,
  toNormalizedEventQueryData,
} from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { ID_EVENT_FORM, ID_SIDEBAR } from "@web/common/constants/web.constants";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { emitViewCommand } from "@web/common/utils/dom/view-command-bus";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  createGridEventDraft,
  getGridDraftId,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { initialViewState, useViewStore } from "@web/events/stores/view.store";
import {
  initialEdgeFocusState,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import {
  getWeekInteractionTargetAttributes,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/week-event.registry";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Fixed 24-hex-char ids so fixtures satisfy EventIdSchema (real ObjectId
// shape) while staying stable/readable across assertions.
const EVENT_1_ID = EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa");
const ALL_DAY_EVENT_1_ID = EventIdSchema.parse("bbbbbbbbbbbbbbbbbbbbbbbb");
const LEFTMOST_EVENT_ID = EventIdSchema.parse("665f0c2f8b3e4a1d9c2b7a01");
const DRAFT_ID = EventIdSchema.parse("dddddddddddddddddddddddd");

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
const LEFTMOST_ALL_DAY_EVENT_ID = EventIdSchema.parse(
  "eeeeeeeeeeeeeeeeeeeeeeee",
);
const leftmostAllDayEvent = createMockEvent({
  id: LEFTMOST_ALL_DAY_EVENT_ID,
  content: {
    kind: "details",
    title: "Leftmost all-day event",
    description: "",
  },
  schedule: EventScheduleSchema.parse({
    kind: "allDay",
    start: "2026-05-18",
    end: "2026-05-19",
  }),
});

// packet 08 step 8: read-only (unwritable calendar) fixtures for the
// delete/nudge gating tests below. Writable calendar must also be seeded
// whenever the calendars query is set — week/day view models filter events
// by visible calendars (S39 A2), so an incomplete list would hide the
// editable event under test.
const READ_ONLY_EVENT_ID = EventIdSchema.parse("cccccccccccccccccccccccc");
const readOnlyCalendarId = CalendarIdSchema.parse(createObjectIdString());
const writableCalendar: Calendar = {
  id: editableEvent.calendarId,
  name: "Primary calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#4285f4",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: true,
  isVisible: true,
  isActive: true,
};
const readOnlyCalendar: Calendar = {
  id: readOnlyCalendarId,
  name: "Shared calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "reader",
  capabilities: getCalendarCapabilities("reader"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
};
const readOnlyEvent = createMockEvent({
  id: READ_ONLY_EVENT_ID,
  calendarId: readOnlyCalendarId,
  content: { kind: "details", title: "Read-only event", description: "" },
  schedule: EventScheduleSchema.parse({
    kind: "timed",
    start: "2026-05-20T13:00:00.000Z",
    end: "2026-05-20T14:00:00.000Z",
    timeZone: "UTC",
  }),
});

const shiftKey = {
  keyDownInit: { shiftKey: true },
  keyUpInit: { shiftKey: true },
};
let pendingEventIds: string[] = [];

const { useWeekShortcutOwner } =
  require("./useWeekShortcutOwner") as typeof import("./useWeekShortcutOwner");

const offsetString = (date: dayjs.Dayjs) =>
  dayjs.tz(date.toDate(), getBrowserTimeZone()).format();

const getEditMutation = (queryClient: QueryClient) =>
  queryClient
    .getMutationCache()
    .getAll()
    .find((mutation) => mutation.options.mutationKey?.[2] === "replace");

beforeEach(() => {
  HotkeyManager.resetInstance();
  useEdgeFocusStore.setState(initialEdgeFocusState, true);
  draftActions.discard();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  pendingEventIds = [];
  weekEventRegistry.clear();
  useViewStore.setState(initialViewState);
  useEdgeFocusStore.setState(initialEdgeFocusState, true);
  draftActions.discard();
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

const addDraftTarget = (
  eventId: string,
  eventType: "all-day" | "timed" = "timed",
) => {
  const button = document.createElement("button");
  Object.defineProperty(button, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  const attributes = getWeekInteractionTargetAttributes({ eventId, eventType });
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) button.setAttribute(key, value);
  }
  button.setAttribute("data-grid-event-surface", "draft");
  document.body.appendChild(button);
  return button;
};

const seedFocusedKeyboardPlaceDraft = () => {
  const draft = createGridEventDraft(
    timedGridSchedule(
      new Date("2026-05-20T09:00:00.000"),
      new Date("2026-05-20T10:00:00.000"),
    ),
    DRAFT_ID,
  );
  draftActions.startGridDraft({ activity: "keyboardPlace", draft });
  const button = addDraftTarget(DRAFT_ID);
  button.focus();
  return button;
};

const renderShortcuts = (options?: {
  includeEditableEvent?: boolean;
  includeAllDayEvent?: boolean;
  includeLeftmostEvent?: boolean;
  /** Extra fixtures beyond the three flags above - e.g. a read-only-calendar event. */
  extraEvents?: Event[];
  /** Seeds the calendars query (read-only gate + A2 visibility filter). Omitted -> unseeded -> events pass the visibility filter and resolve writable (fails open). */
  calendars?: Calendar[];
}) => {
  const queryClient = new QueryClient();
  seedPendingEventMutations(queryClient, pendingEventIds);
  const events = [
    ...(options?.includeEditableEvent === false ? [] : [editableEvent]),
    ...(options?.includeAllDayEvent ? [editableAllDayEvent] : []),
    ...(options?.includeLeftmostEvent ? [leftmostEvent] : []),
    ...(options?.extraEvents ?? []),
  ];
  queryClient.setQueryData(
    eventQueryKeys.week({
      source: "local",
      start: "2026-05-18T00:00:00.000Z",
      end: "2026-05-24T23:59:59.999Z",
    }),
    toNormalizedEventQueryData(events),
  );
  queryClient.setQueryDefaults(["events"], {
    initialData: toNormalizedEventQueryData(events),
  });
  // Always seed calendars so useWeekEventViewModel's visibility filter and
  // useCalendarsQuery see the fixture calendars instead of racing a fetch.
  // Default = writable calendar for the editable event.
  queryClient.setQueryData(
    calendarQueryKeys.all,
    options?.calendars ?? [writableCalendar],
  );
  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <HotkeysProvider>{children}</HotkeysProvider>
      </QueryClientProvider>
    );
  }

  const shiftViewByDay = mock();

  renderHook(
    () =>
      useWeekShortcutOwner({
        endOfView: dayjs("2026-05-24T00:00:00.000"),
        isCurrentWeek: true,
        queryEndOfView: dayjs("2026-05-24T23:59:59.999"),
        queryStartOfView: dayjs("2026-05-18T00:00:00.000"),
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
          shiftViewByDay,
        },
      }),
    { wrapper },
  );

  return { queryClient, shiftViewByDay };
};

describe("useWeekShortcutOwner day shifting", () => {
  it("shifts the view backward with Shift+J", () => {
    const { shiftViewByDay } = renderShortcuts();

    pressKey("J", shiftKey);

    expect(shiftViewByDay).toHaveBeenCalledWith(-1);
  });

  it("shifts the view forward with Shift+K", () => {
    const { shiftViewByDay } = renderShortcuts();

    pressKey("K", shiftKey);

    expect(shiftViewByDay).toHaveBeenCalledWith(1);
  });
});

describe("useWeekShortcutOwner calendar event targeting", () => {
  it("focuses the first visible calendar event with U", async () => {
    const button = addCalendarTarget();

    renderShortcuts();
    pressKey("U");

    await waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
  });

  it("moves the active shortcut-created draft with arrow keys", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );
    draftActions.startGridDraft({ activity: "createShortcut", draft });
    renderShortcuts();

    pressKey("ArrowRight");

    const schedule = useDraftStore.getState().gridDraft?.values.schedule;
    expect(dayjs(schedule?.start).format()).toBe(
      dayjs("2026-05-21T09:00:00.000").format(),
    );
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
    renderShortcuts();

    pressKey("ArrowRight", {}, input);

    const schedule = useDraftStore.getState().gridDraft?.values.schedule;
    expect(dayjs(schedule?.start).format()).toBe(
      dayjs("2026-05-20T09:00:00.000").format(),
    );
  });

  it("moves the draft when arrow keys are pressed from a non-text event form control", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );
    draftActions.startGridDraft({ activity: "createShortcut", draft });
    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();
    renderShortcuts();

    pressKey("ArrowRight", {}, button);

    const schedule = useDraftStore.getState().gridDraft?.values.schedule;
    expect(dayjs(schedule?.start).format()).toBe(
      dayjs("2026-05-21T09:00:00.000").format(),
    );
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

  it("does not delete a calendar event with Delete when nothing is focused", () => {
    addCalendarTarget();

    const { queryClient } = renderShortcuts();
    pressKey("Delete");

    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it("duplicates the focused calendar event with Mod+D", () => {
    const button = addCalendarTarget();
    button.focus();
    const { queryClient } = renderShortcuts();

    pressKey("d", {
      keyDownInit: { ctrlKey: true },
      keyUpInit: { ctrlKey: true },
    });

    const created = queryClient
      .getMutationCache()
      .getAll()
      .find((mutation) => mutation.options.mutationKey?.[2] === "create");
    const { input } = created?.state.variables as {
      input: { calendarId: string; content: { title: string } };
    };
    expect(input.calendarId).toBe(editableEvent.calendarId);
    expect(input.content.title).toBe("Editable event");

    const state = useDraftStore.getState();
    expect(state.status?.isFormOpen).toBe(false);
    expect(state.gridDraft).toBeNull();
  });

  it("keeps ArrowDown on the same day when a later event exists that day", () => {
    const sameDayLaterId = EventIdSchema.parse("dddddddddddddddddddddddd");
    const sameDayLater = createMockEvent({
      id: sameDayLaterId,
      content: { kind: "details", title: "Same day later", description: "" },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-05-20T14:00:00.000Z",
        end: "2026-05-20T15:00:00.000Z",
        timeZone: "UTC",
      }),
    });
    const earlier = addCalendarTarget(editableEvent.id);
    const later = addCalendarTarget(sameDayLaterId);
    earlier.focus();
    renderShortcuts({ extraEvents: [sameDayLater] });

    pressKey("ArrowDown");

    expect(document.activeElement).toBe(later);
  });

  it("does not leave the day with ArrowDown when no later same-day event exists", () => {
    const earlier = addCalendarTarget(leftmostEvent.id);
    addCalendarTarget(editableEvent.id);
    earlier.focus();
    renderShortcuts({ includeLeftmostEvent: true });

    pressKey("ArrowDown");

    expect(document.activeElement).toBe(earlier);
  });

  it("focuses the time-nearest event on the next non-empty day with ArrowRight", () => {
    const monday = addCalendarTarget(leftmostEvent.id);
    const wednesday = addCalendarTarget(editableEvent.id);
    monday.focus();
    renderShortcuts({ includeLeftmostEvent: true });

    pressKey("ArrowRight");

    expect(document.activeElement).toBe(wednesday);
  });

  it("focuses the time-nearest event on the previous non-empty day with ArrowLeft", () => {
    const monday = addCalendarTarget(leftmostEvent.id);
    const wednesday = addCalendarTarget(editableEvent.id);
    wednesday.focus();
    renderShortcuts({ includeLeftmostEvent: true });

    pressKey("ArrowLeft");

    expect(document.activeElement).toBe(monday);
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

  // packet 08 step 8: a read-only event (unwritable calendar) can be
  // inspected but never mutated - Delete must be a no-op blocked before any
  // mutation reaches the query cache.
  it("does not delete a read-only calendar event with Delete", () => {
    const button = addCalendarTarget(readOnlyEvent.id);
    button.focus();

    const { queryClient } = renderShortcuts({
      extraEvents: [readOnlyEvent],
      calendars: [readOnlyCalendar],
    });
    pressKey("Delete");

    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some(
          (mutation) =>
            (mutation.state.variables as { id?: string }).id ===
            READ_ONLY_EVENT_ID,
        ),
    ).toBe(false);
  });

  // Same fixture set, but the targeted event is the ordinary writable one -
  // proves the read-only gate above doesn't leak into unrelated events.
  it("still deletes a writable calendar event with Delete when a read-only calendar is also present", () => {
    const button = addCalendarTarget();
    button.focus();

    const { queryClient } = renderShortcuts({
      extraEvents: [readOnlyEvent],
      calendars: [writableCalendar, readOnlyCalendar],
    });
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

describe("useWeekShortcutOwner shift+arrow event moves", () => {
  it("moves the focused timed event to the next day with Shift+ArrowRight", async () => {
    const button = addCalendarTarget();
    button.focus();
    const { queryClient } = renderShortcuts();

    pressKey("ArrowRight", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string; end: string } };
    };
    expect(input.schedule.start).toBe(
      offsetString(dayjs("2026-05-20T09:00:00.000Z").add(1, "day")),
    );
    expect(input.schedule.end).toBe(
      offsetString(dayjs("2026-05-20T10:00:00.000Z").add(1, "day")),
    );
  });

  // packet 08 step 8: nudging (moving) a read-only event must be blocked
  // the same way deleting it is - no replace mutation is queued.
  it("does not move a read-only calendar event with Shift+ArrowRight", async () => {
    const button = addCalendarTarget(readOnlyEvent.id);
    button.focus();
    const { queryClient } = renderShortcuts({
      extraEvents: [readOnlyEvent],
      calendars: [readOnlyCalendar],
    });

    pressKey("ArrowRight", shiftKey);

    // No async work should follow a blocked nudge, but give any stray
    // microtask a turn before asserting the negative.
    await act(async () => {
      await Promise.resolve();
    });
    expect(getEditMutation(queryClient)).toBeUndefined();
    // Read-only focus must not fall through into place-create either.
    expect(useDraftStore.getState().gridDraft).toBeNull();
  });

  it("moves the focused timed event by 15 minutes with Shift+ArrowUp and Shift+ArrowDown", async () => {
    const button = addCalendarTarget();
    button.focus();
    const { queryClient } = renderShortcuts();

    pressKey("ArrowUp", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const movedUp = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string } };
    };
    expect(movedUp.input.schedule.start).toBe(
      offsetString(dayjs("2026-05-20T09:00:00.000Z").subtract(15, "minutes")),
    );

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .filter(
            (mutation) => mutation.options.mutationKey?.[2] === "replace",
          ),
      ).toHaveLength(2);
    });
    const movedDown = queryClient
      .getMutationCache()
      .getAll()
      .filter((mutation) => mutation.options.mutationKey?.[2] === "replace")[1]
      ?.state.variables as { input: { schedule: { start: string } } };
    // ArrowDown starts from the already-nudged cache (08:45), so +15m returns
    // to the original start — not another +15m from the pre-Up fixture.
    expect(movedDown.input.schedule.start).toBe(
      offsetString(dayjs("2026-05-20T09:00:00.000Z")),
    );
  });

  it("carries the focused event across the window edge with Shift+ArrowLeft on the first visible day", () => {
    const button = addCalendarTarget(leftmostEvent.id);
    button.focus();

    const { queryClient, shiftViewByDay } = renderShortcuts({
      includeLeftmostEvent: true,
    });
    pressKey("ArrowLeft", shiftKey);

    // The nudge commits and the view slides one day to keep it on screen.
    expect(getEditMutation(queryClient)).toBeDefined();
    expect(shiftViewByDay).toHaveBeenCalledWith(-1);
  });

  it("does not move all-day events with Shift+ArrowUp", () => {
    const button = addCalendarTarget(editableAllDayEvent.id, "all-day");
    button.focus();

    const { queryClient } = renderShortcuts({ includeAllDayEvent: true });
    pressKey("ArrowUp", shiftKey);

    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("keeps native Shift+Arrow behavior inside editable fields", () => {
    addCalendarTarget();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { queryClient } = renderShortcuts();
    pressKey("ArrowRight", shiftKey, input);

    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("does not move unfocused events", () => {
    addCalendarTarget();

    const { queryClient } = renderShortcuts();
    pressKey("ArrowRight", shiftKey);

    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("places a keyboardPlace timed draft when Shift+Arrow is pressed with no focus", async () => {
    renderShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      const { gridDraft, status } = useDraftStore.getState();
      expect(status?.activity).toBe("keyboardPlace");
      expect(status?.isFormOpen).toBe(false);
      expect(gridDraft?.values.calendarId).toBe(writableCalendar.id);
    });
  });

  it("repositions a keyboardPlace draft with a later Shift+Arrow", async () => {
    renderShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
    });
    const placed = useDraftStore.getState().gridDraft!;
    draftActions.setGridDraft(
      replaceGridDraftSchedule(
        placed,
        timedGridSchedule(
          new Date("2026-05-20T09:00:00.000"),
          new Date("2026-05-20T10:00:00.000"),
        ),
      ),
    );

    pressKey("ArrowDown", shiftKey);

    const after = useDraftStore.getState().gridDraft!.values.schedule.start;
    expect(dayjs(after).format()).toBe(
      dayjs("2026-05-20T09:15:00.000").format(),
    );
    expect(useDraftStore.getState().status?.isFormOpen).toBe(false);
  });

  it("does not reseed a keyboardPlace draft when Shift+Arrow cannot move it", async () => {
    renderShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
    });
    const placed = useDraftStore.getState().gridDraft!;
    const placedId = getGridDraftId(placed);
    draftActions.setGridDraft(
      replaceGridDraftSchedule(
        placed,
        timedGridSchedule(
          new Date("2026-05-20T23:00:00.000"),
          new Date("2026-05-21T00:00:00.000"),
        ),
      ),
    );

    pressKey("ArrowDown", shiftKey);

    expect(getGridDraftId(useDraftStore.getState().gridDraft!)).toBe(placedId);
    expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
  });

  it("discards a form-closed keyboardPlace draft on Escape", async () => {
    renderShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
    });

    pressKey("Escape");

    expect(useDraftStore.getState().gridDraft).toBeNull();
    expect(useDraftStore.getState().status?.isDrafting).toBe(false);
  });

  it("discards a repositioned keyboardPlace draft on Escape", async () => {
    renderShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
    });

    pressKey("ArrowDown", shiftKey);
    pressKey("Escape");

    expect(useDraftStore.getState().gridDraft).toBeNull();
    expect(useDraftStore.getState().status?.isDrafting).toBe(false);
  });

  it("does not discard a keyboardPlace draft on Escape while the form is open", async () => {
    renderShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
    });

    act(() => {
      draftActions.setFormOpen(true);
    });

    pressKey("Escape");

    expect(useDraftStore.getState().status?.activity).toBe("keyboardPlace");
    expect(useDraftStore.getState().gridDraft).not.toBeNull();
  });
});

describe("useWeekShortcutOwner edge focus", () => {
  it("cycles edge focus with Tab and moves only the focused edge", async () => {
    const button = addCalendarTarget();
    button.focus();
    const { queryClient } = renderShortcuts();

    pressKey("Tab");
    expect(useEdgeFocusStore.getState()).toMatchObject({
      eventId: EVENT_1_ID,
      edge: "startDate",
    });

    pressKey("ArrowUp", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string; end: string } };
    };
    expect(input.schedule.start).toBe(
      offsetString(dayjs("2026-05-20T09:00:00.000Z").subtract(15, "minutes")),
    );
    expect(input.schedule.end).toBe(
      offsetString(dayjs("2026-05-20T10:00:00.000Z")),
    );
  });

  it("refuses an all-day start-edge move that would leave the visible week", () => {
    const button = addCalendarTarget(LEFTMOST_ALL_DAY_EVENT_ID, "all-day");
    button.focus();
    const { queryClient } = renderShortcuts({
      extraEvents: [leftmostAllDayEvent],
    });

    pressKey("Tab");
    pressKey("ArrowLeft", shiftKey);

    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("allows an all-day end-edge move into the visible week's last day", async () => {
    // weekDays run 2026-05-18..2026-05-24; this event's last occupied day is
    // 05-23 (exclusive endDate 05-24), so extending into 05-24 is in bounds -
    // regression test for an off-by-one that compared the exclusive endDate
    // directly against the inclusive week boundary.
    const RIGHTMOST_ALL_DAY_EVENT_ID = EventIdSchema.parse(
      "ffffffffffffffffffffffff",
    );
    const rightmostAllDayEvent = createMockEvent({
      id: RIGHTMOST_ALL_DAY_EVENT_ID,
      content: {
        kind: "details",
        title: "Rightmost all-day event",
        description: "",
      },
      schedule: EventScheduleSchema.parse({
        kind: "allDay",
        start: "2026-05-22",
        end: "2026-05-24",
      }),
    });
    const button = addCalendarTarget(RIGHTMOST_ALL_DAY_EVENT_ID, "all-day");
    button.focus();
    const { queryClient } = renderShortcuts({
      extraEvents: [rightmostAllDayEvent],
    });

    pressKey("Tab");
    pressKey("Tab");
    pressKey("ArrowRight", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { input } = getEditMutation(queryClient)?.state.variables as {
      input: { schedule: { start: string; end: string } };
    };
    expect(input.schedule.start).toBe("2026-05-22");
    expect(input.schedule.end).toBe("2026-05-25");
  });
});

describe("useWeekShortcutOwner draft edge focus", () => {
  it("cycles edge focus with Tab on a form-closed keyboardPlace draft", () => {
    seedFocusedKeyboardPlaceDraft();
    renderShortcuts();

    pressKey("Tab");
    expect(useEdgeFocusStore.getState()).toMatchObject({
      eventId: DRAFT_ID,
      edge: "startDate",
    });

    pressKey("Tab");
    expect(useEdgeFocusStore.getState().edge).toBe("endDate");
  });

  it("lets Tab leave a draft natively past the end edge instead of trapping focus", () => {
    seedFocusedKeyboardPlaceDraft();
    renderShortcuts();

    pressKey("Tab");
    pressKey("Tab");
    expect(useEdgeFocusStore.getState().edge).toBe("endDate");

    const thirdTab = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    });
    document.dispatchEvent(thirdTab);

    expect(thirdTab.defaultPrevented).toBe(false);
    expect(useEdgeFocusStore.getState().edge).toBeNull();
  });

  it("does not cycle edge focus on a draft while the form is open", () => {
    seedFocusedKeyboardPlaceDraft();
    draftActions.setFormOpen(true);
    renderShortcuts();

    pressKey("Tab");

    expect(useEdgeFocusStore.getState().eventId).toBeNull();
  });

  it("moves only the draft start edge with Shift+ArrowUp when that edge is focused", () => {
    seedFocusedKeyboardPlaceDraft();
    const { queryClient } = renderShortcuts();

    pressKey("Tab");
    pressKey("ArrowUp", shiftKey);

    const schedule = useDraftStore.getState().gridDraft?.values.schedule;
    expect(dayjs(schedule?.start).format()).toBe(
      dayjs("2026-05-20T09:00:00.000").subtract(15, "minutes").format(),
    );
    expect(dayjs(schedule?.end).format()).toBe(
      dayjs("2026-05-20T10:00:00.000").format(),
    );
    expect(useEdgeFocusStore.getState().edge).toBe("startDate");
    expect(getEditMutation(queryClient)).toBeUndefined();
  });
});

const addSidebarFixture = (options?: { includeItem?: boolean }) => {
  const sidebar = document.createElement("aside");
  sidebar.id = ID_SIDEBAR;

  const item = document.createElement("button");
  item.setAttribute("aria-label", "Sidebar item");
  const weekItem = options?.includeItem ? item : null;
  if (weekItem) sidebar.appendChild(weekItem);

  const addButton = document.createElement("button");
  addButton.setAttribute("aria-label", "Add item to week");
  sidebar.appendChild(addButton);

  document.body.appendChild(sidebar);
  return { addButton, sidebar, weekItem };
};

describe("useWeekShortcutOwner sidebar focus", () => {
  it("focuses the first interactive sidebar item with I", async () => {
    const { weekItem } = addSidebarFixture({ includeItem: true });

    renderShortcuts();
    pressKey("I");

    await waitFor(() => {
      expect(document.activeElement).toBe(weekItem);
    });
  });

  it("does not delete a grid event when Delete is pressed with sidebar focus", async () => {
    addCalendarTarget();
    const { weekItem } = addSidebarFixture({ includeItem: true });
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

// D6: "C"/"A" used to call the create functions directly *and* subscribe to
// the view command bus (two paths to the same result). They now only emit
// on the bus, matching Day's convention - these presses exercise that path.
describe("useWeekShortcutOwner create shortcuts", () => {
  it("starts a timed createShortcut draft when C is pressed", async () => {
    renderShortcuts();
    pressKey("C");

    await waitFor(() => {
      const { gridDraft, status } = useDraftStore.getState();
      expect(status?.activity).toBe("createShortcut");
      expect(gridDraft?.values.calendarId).toBe(writableCalendar.id);
    });
  });

  it("starts an all-day createShortcut draft when A is pressed", async () => {
    renderShortcuts();
    pressKey("A");

    await waitFor(() => {
      const { gridDraft, status } = useDraftStore.getState();
      expect(status?.activity).toBe("createShortcut");
      expect(gridDraft?.values.calendarId).toBe(writableCalendar.id);
    });
  });
});

// The command palette's "Create event"/"Create all-day event" rows emit
// these same view commands (event.cmd.constants.ts) instead of calling Week
// code directly - this is what lets one shared list serve every view.
describe("useWeekShortcutOwner view command bus", () => {
  it("starts a timed createShortcut draft when CREATE_TIMED_DRAFT is emitted", async () => {
    renderShortcuts();

    act(() => {
      emitViewCommand("CREATE_TIMED_DRAFT");
    });

    await waitFor(() => {
      const { gridDraft, status } = useDraftStore.getState();
      expect(status?.activity).toBe("createShortcut");
      expect(gridDraft?.values.calendarId).toBe(writableCalendar.id);
    });
  });

  it("starts an all-day createShortcut draft when CREATE_ALLDAY_DRAFT is emitted", async () => {
    renderShortcuts();

    act(() => {
      emitViewCommand("CREATE_ALLDAY_DRAFT");
    });

    await waitFor(() => {
      const { gridDraft, status } = useDraftStore.getState();
      expect(status?.activity).toBe("createShortcut");
      expect(gridDraft?.values.calendarId).toBe(writableCalendar.id);
    });
  });
});
