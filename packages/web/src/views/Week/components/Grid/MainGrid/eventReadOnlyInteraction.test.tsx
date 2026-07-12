import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import {
  type CalendarId,
  CalendarIdSchema,
} from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@web/__tests__/__mocks__/mock.render";
import { seedEventQueries } from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { createCompassQueryClient } from "@web/api/query-client";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import {
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/weekEventRegistry";
import { AllDayEvents } from "../AllDayRow/AllDayEvents";
import { MainGridEvents } from "./MainGridEvents";
import { afterEach, describe, expect, it, mock } from "bun:test";

// packet 08 step 8: an event on a read-only (unwritable) calendar, or with
// busy content, must never attach interaction attributes / registry
// registration - that's the concrete mechanism that stops the drag/resize
// engine from ever treating it as a target, blocked before any optimistic
// state change. The resize-handle/interaction-attribute DOM is unlabeled
// (aria-hidden), so this asserts the "props seam" at the list-component
// level instead: the interaction-registry id attribute the engine keys off
// of (WEEK_INTERACTION_EVENT_ID_ATTRIBUTE), mirroring how MainGrid.test.tsx
// already asserts the writable case ("keeps pending saved events fully
// interactive").

let seededEvents: Event[] = [];
let seededCalendars: Calendar[] = [];

function Provider({ children }: PropsWithChildren) {
  // useState initializer: exactly one client per mounted tree. Creating and
  // seeding in the render body rebuilds an EMPTY client on every re-render,
  // and the fresh cache then really fetches /api/calendars (no handler in
  // this file) - a timing-dependent failure that only shows on slow (CI)
  // runners.
  const [queryClient] = useState(() => {
    const client = createCompassQueryClient();
    seedEventQueries(client, seededEvents);
    client.setQueryData(calendarQueryKeys.all, seededCalendars);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  weekEventRegistry.clear();
  seededEvents = [];
  seededCalendars = [];
});

const startOfView = dayjs("2024-01-14T00:00:00.000");
const weekDaysInView = Array.from({ length: 7 }, (_, index) =>
  startOfView.add(index, "day"),
);
const measurements = {
  allDayRow: null,
  colWidths: [100, 100, 100, 100, 100, 100, 100],
  hourHeight: 60,
  mainGrid: {
    bottom: 780,
    height: 780,
    left: 0,
    right: 700,
    top: 0,
    width: 700,
    x: 0,
    y: 0,
  },
} satisfies Measurements_Grid;

const createWeekProps = () => ({
  component: {
    category: "current" as const,
    endOfView: startOfView.endOf("week"),
    isCurrentWeek: true,
    startOfView,
    week: startOfView.week(),
    weekDays: Array.from({ length: 7 }, (_, index) =>
      startOfView.add(index, "day"),
    ),
  },
  state: { goToDate: mock() },
  util: {
    decrementWeek: mock(),
    getLastNavigationSource: mock(() => "manual" as const),
    goToToday: mock(),
    incrementWeek: mock(),
    shiftViewByDay: mock(),
  },
});

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
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
  ...overrides,
});

const createTimedEvent = (
  calendarId: CalendarId,
  overrides: Partial<Event> = {},
) =>
  createMockEvent({
    calendarId,
    content: { kind: "details", title: "Shared meeting", description: "" },
    schedule: EventScheduleSchema.parse({
      kind: "timed",
      start: "2024-01-15T09:00:00.000Z",
      end: "2024-01-15T10:00:00.000Z",
      timeZone: "UTC",
    }),
    ...overrides,
  });

const createAllDayEvent = (
  calendarId: CalendarId,
  overrides: Partial<Event> = {},
) =>
  createMockEvent({
    calendarId,
    content: { kind: "details", title: "Team holiday", description: "" },
    schedule: EventScheduleSchema.parse({
      kind: "allDay",
      start: "2024-01-15",
      end: "2024-01-16",
    }),
    ...overrides,
  });

const renderMainGridEvents = () =>
  render(
    <Provider>
      <DraftContext.Provider
        value={
          {
            actions: { stopDragging: mock(), stopResizing: mock() },
            confirmation: {},
            setters: {},
            state: {},
          } as never
        }
      >
        <MainGridEvents
          measurements={measurements}
          weekProps={createWeekProps()}
        />
      </DraftContext.Provider>
    </Provider>,
  );

const renderAllDayEvents = () =>
  render(
    <Provider>
      <DraftContext.Provider
        value={
          {
            actions: { stopDragging: mock(), stopResizing: mock() },
            confirmation: {},
            setters: {},
            state: {},
          } as never
        }
      >
        <AllDayEvents
          endOfView={startOfView.endOf("week")}
          measurements={measurements}
          startOfView={startOfView}
          weekDays={weekDaysInView}
        />
      </DraftContext.Provider>
    </Provider>,
  );

describe("Week grid read-only interaction gate", () => {
  it("does not register a read-only-calendar timed event as an interaction target", () => {
    const readOnlyCalendar = makeCalendar();
    seededCalendars = [readOnlyCalendar];
    seededEvents = [createTimedEvent(readOnlyCalendar.id)];

    renderMainGridEvents();

    const card = screen.getByRole("button", { name: /shared meeting/i });
    expect(card).not.toHaveAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE);
  });

  it("keeps registering a writable-calendar timed event as an interaction target", () => {
    const writableCalendar = makeCalendar({
      access: "owner",
      capabilities: getCalendarCapabilities("owner"),
    });
    seededCalendars = [writableCalendar];
    const event = createTimedEvent(writableCalendar.id, {
      content: { kind: "details", title: "My focus block", description: "" },
    });
    seededEvents = [event];

    renderMainGridEvents();

    const card = screen.getByRole("button", { name: /my focus block/i });
    expect(card).toHaveAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE, event.id);
  });

  it("does not register a read-only-calendar all-day event as an interaction target", () => {
    const readOnlyCalendar = makeCalendar();
    seededCalendars = [readOnlyCalendar];
    seededEvents = [createAllDayEvent(readOnlyCalendar.id)];

    renderAllDayEvents();

    const card = screen.getByRole("button", {
      name: /all-day event: team holiday/i,
    });
    expect(card).not.toHaveAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE);
  });

  it("still opens a read-only timed event for inspection on click", () => {
    const readOnlyCalendar = makeCalendar();
    seededCalendars = [readOnlyCalendar];
    const event = createTimedEvent(readOnlyCalendar.id, {
      content: { kind: "details", title: "Inspect me", description: "" },
    });
    seededEvents = [event];

    renderMainGridEvents();

    const card = screen.getByRole("button", { name: /inspect me/i });
    fireEvent.mouseDown(card, { button: 0, buttons: 1 });

    expect(useDraftStore.getState().status?.activity).toBe("keyboardEdit");
    expect(useDraftStore.getState().event?._id).toBe(event.id);

    draftActions.discard();
  });

  it("treats a busy timed event as read-only, and renders 'Busy' as its title, even on a writable calendar", () => {
    const writableCalendar = makeCalendar({
      access: "owner",
      capabilities: getCalendarCapabilities("owner"),
    });
    seededCalendars = [writableCalendar];
    seededEvents = [
      createTimedEvent(writableCalendar.id, { content: { kind: "busy" } }),
    ];

    renderMainGridEvents();

    const card = screen.getByRole("button", { name: /timed event: busy/i });
    expect(card).not.toHaveAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE);
  });
});
