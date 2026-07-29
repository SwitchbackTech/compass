import userEvent from "@testing-library/user-event";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { formatStartsIn, UpNextCard } from "./UpNextCard";
import { useUpNextEventShortcut } from "./useUpNextEvent";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

const SOON_EVENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const LATER_EVENT_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

// Events are built relative to the real clock because the card's whole job is
// comparing today's events against "now".
const timedEvent = (
  id: string,
  title: string,
  startsInMinutes: number,
): Event => {
  const start = dayjs().add(startsInMinutes, "minute");
  return createMockEvent({
    id: EventIdSchema.parse(id),
    content: { kind: "details", title, description: "" },
    schedule: EventScheduleSchema.parse({
      kind: "timed",
      start: start.format(),
      end: start.add(30, "minute").format(),
      timeZone: "UTC",
    }),
  });
};

beforeEach(() => {
  draftActions.discard();
});

afterEach(() => {
  cleanup();
});

describe("formatStartsIn", () => {
  const now = dayjs("2026-05-20T09:00:00.000Z");
  const inMinutes = (minutes: number) => now.add(minutes, "minute");

  it("counts down in minutes below an hour", () => {
    expect(formatStartsIn(inMinutes(5), now)).toBe("Starts in 5 minutes");
  });

  it("uses the singular for one minute", () => {
    expect(formatStartsIn(inMinutes(1), now)).toBe("Starts in 1 minute");
  });

  it("rolls up to hours at an hour and beyond", () => {
    expect(formatStartsIn(inMinutes(60), now)).toBe("Starts in 1 hour");
    expect(formatStartsIn(inMinutes(120), now)).toBe("Starts in 2 hours");
  });

  it("reads 'Starts now' within the last half minute", () => {
    expect(formatStartsIn(now.add(20, "second"), now)).toBe("Starts now");
  });
});

describe("UpNextCard", () => {
  it("shows the soonest upcoming timed event left today", () => {
    render(<UpNextCard />, {
      events: [
        timedEvent(LATER_EVENT_ID, "Later Event", 90),
        timedEvent(SOON_EVENT_ID, "Soon Event", 30),
      ],
    });

    expect(screen.getByText("Soon Event")).toBeInTheDocument();
    expect(screen.getByText("Starts in 30 minutes")).toBeInTheDocument();
    expect(screen.queryByText("Later Event")).toBeNull();
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("renders nothing when today has no upcoming timed events", () => {
    render(<UpNextCard />, {
      events: [
        // Already underway, so nothing is "up next".
        timedEvent(SOON_EVENT_ID, "Past Event", -30),
        createMockEvent({
          id: EventIdSchema.parse(LATER_EVENT_ID),
          content: { kind: "details", title: "All Day Event", description: "" },
          schedule: EventScheduleSchema.parse({
            kind: "allDay",
            start: dayjs().format("YYYY-MM-DD"),
            end: dayjs().add(1, "day").format("YYYY-MM-DD"),
          }),
        }),
      ],
    });

    expect(screen.queryByRole("region", { name: "Up next" })).toBeNull();
    expect(
      screen.queryByText("Nothing scheduled — press C to add an event."),
    ).toBeNull();
    expect(screen.queryByText("Past Event")).toBeNull();
    expect(screen.queryByText("All Day Event")).toBeNull();
  });

  it("opens the event's details in the sidebar when clicked", async () => {
    render(<UpNextCard />, {
      events: [timedEvent(SOON_EVENT_ID, "Soon Event", 30)],
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Up next: Soon Event/ }),
    );

    await waitFor(() => {
      const state = useDraftStore.getState();
      expect(state.status?.isFormOpen).toBe(true);
      expect(state.gridDraft?.source?.id).toBe(
        EventIdSchema.parse(SOON_EVENT_ID),
      );
    });
  });
});

describe("useUpNextEventShortcut", () => {
  it("opens the next event form with n", async () => {
    const user = userEvent.setup();
    const ShortcutHarness = () => {
      useUpNextEventShortcut();
      return null;
    };

    render(<ShortcutHarness />, {
      events: [timedEvent(SOON_EVENT_ID, "Soon Event", 30)],
    });

    await user.keyboard("n");

    await waitFor(() => {
      const state = useDraftStore.getState();
      expect(state.status?.isFormOpen).toBe(true);
      expect(state.status?.activity).toBe("keyboardEdit");
      expect(state.gridDraft?.source?.id).toBe(
        EventIdSchema.parse(SOON_EVENT_ID),
      );
    });
  });

  it("does nothing when there is no upcoming event", async () => {
    const user = userEvent.setup();
    const ShortcutHarness = () => {
      useUpNextEventShortcut();
      return null;
    };

    render(<ShortcutHarness />, { events: [] });

    await user.keyboard("n");

    expect(useDraftStore.getState().status?.isFormOpen).toBe(false);
  });
});
