import { HotkeyManager } from "@tanstack/react-hotkeys";
import { Origin, Priorities } from "@core/constants/core.constants";
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
import { createCompassQueryClient } from "@web/api/query-client";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { dayCalendarEventRegistry } from "@web/views/Day/interaction/registry/dayCalendarEventRegistry";
import { useDayEventNudgeShortcuts } from "./useDayEventNudgeShortcuts";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

// useUpdateEvent gates the nudge write on `EventIdSchema.safeParse(event._id)`
// succeeding, so this id must be a real ObjectId (not a readable label) or
// the mutation silently no-ops.
const TIMED_EVENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

const timedEvent: Schema_GridEvent = {
  _id: TIMED_EVENT_ID,
  endDate: "2026-05-20T10:00:00.000",
  isAllDay: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-05-20T09:00:00.000",
  title: "Timed event",
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

const shiftKey = {
  keyDownInit: { shiftKey: true },
  keyUpInit: { shiftKey: true },
};

const focusCalendarTarget = (eventType: "all-day" | "timed") => {
  const button = document.createElement("button");
  document.body.appendChild(button);
  dayCalendarEventRegistry.register({
    element: button,
    eventId: timedEvent._id!,
    eventType,
  });
  button.focus();
  return button;
};

const renderNudgeShortcuts = () => {
  const queryClient = createCompassQueryClient();
  // useUpdateEvent now reads the source `Event` straight from the query
  // cache (editGridEventDraft needs it), rather than the seeded-events
  // `initialData` default this harness normally relies on — that default
  // only applies once a real query mounts, and this hook mounts none of its
  // own. Register a real cache entry so `findEventInCache` can see it.
  queryClient.setQueryData(
    eventQueryKeys.day({
      source: "local",
      start: "2026-05-20T00:00:00.000Z",
      end: "2026-05-21T00:00:00.000Z",
    }),
    toNormalizedEventQueryData([timedEventContract]),
  );
  renderHook(() => useDayEventNudgeShortcuts({ timedEvents: [timedEvent] }), {
    events: [timedEventContract],
    queryClient,
  });
  return { queryClient };
};

// The mutation's write path formats the moved instant in the browser's own
// time zone (matching every other GridEventDraft-based submit path), not
// dayjs's default local-offset `.format()`.
const offsetString = (date: Dayjs) =>
  dayjs.tz(date.toDate(), getBrowserTimeZone()).format();

const getEditMutation = (
  queryClient: ReturnType<typeof createCompassQueryClient>,
) =>
  queryClient
    .getMutationCache()
    .getAll()
    .find((mutation) => mutation.options.mutationKey?.[2] === "replace");

beforeEach(() => {
  HotkeyManager.resetInstance();
});

afterEach(() => {
  cleanup();
  dayCalendarEventRegistry.clear();
  document.body.innerHTML = "";
});

describe("useDayEventNudgeShortcuts", () => {
  it("moves the focused timed event 15 minutes earlier with Shift+ArrowUp", async () => {
    focusCalendarTarget("timed");
    const { queryClient } = renderNudgeShortcuts();

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
    focusCalendarTarget("timed");
    const { queryClient } = renderNudgeShortcuts();

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

  it("does not move all-day events", async () => {
    focusCalendarTarget("all-day");
    const { queryClient } = renderNudgeShortcuts();

    pressKey("ArrowUp", shiftKey);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getEditMutation(queryClient)).toBeUndefined();
  });

  it("does not move anything when no event is focused", async () => {
    const { queryClient } = renderNudgeShortcuts();

    pressKey("ArrowUp", shiftKey);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getEditMutation(queryClient)).toBeUndefined();
  });
});
