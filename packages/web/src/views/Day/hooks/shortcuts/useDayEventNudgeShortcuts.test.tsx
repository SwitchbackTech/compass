import { HotkeyManager } from "@tanstack/react-hotkeys";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import {
  cleanup,
  renderHook,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { dayCalendarEventRegistry } from "@web/views/Day/interaction/registry/dayCalendarEventRegistry";
import { useDayEventNudgeShortcuts } from "./useDayEventNudgeShortcuts";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const timedEvent: Schema_GridEvent = {
  _id: "timed-event",
  endDate: "2026-05-20T10:00:00.000",
  isAllDay: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-05-20T09:00:00.000",
  title: "Timed event",
  user: "user-1",
};

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
  renderHook(() => useDayEventNudgeShortcuts({ timedEvents: [timedEvent] }), {
    events: [timedEvent],
    queryClient,
  });
  return { queryClient };
};

const getEditMutation = (
  queryClient: ReturnType<typeof createCompassQueryClient>,
) =>
  queryClient
    .getMutationCache()
    .getAll()
    .find((mutation) => mutation.options.mutationKey?.[2] === "edit");

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
    const { event } = getEditMutation(queryClient)?.state.variables as {
      event: { startDate: string; endDate: string };
    };
    expect(event.startDate).toBe(
      dayjs(timedEvent.startDate).subtract(15, "minutes").format(),
    );
    expect(event.endDate).toBe(
      dayjs(timedEvent.endDate).subtract(15, "minutes").format(),
    );
  });

  it("moves the focused timed event 15 minutes later with Shift+ArrowDown", async () => {
    focusCalendarTarget("timed");
    const { queryClient } = renderNudgeShortcuts();

    pressKey("ArrowDown", shiftKey);

    await waitFor(() => {
      expect(getEditMutation(queryClient)).toBeDefined();
    });
    const { event } = getEditMutation(queryClient)?.state.variables as {
      event: { startDate: string };
    };
    expect(event.startDate).toBe(
      dayjs(timedEvent.startDate).add(15, "minutes").format(),
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
