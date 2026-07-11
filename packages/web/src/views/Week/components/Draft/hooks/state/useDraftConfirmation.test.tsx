import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { ObjectId } from "bson";
import { type PropsWithChildren } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { normalizeEventList } from "@web/events/queries/event.query.normalize";
import { useDraftConfirmation } from "./useDraftConfirmation";
import { describe, expect, it, mock } from "bun:test";

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2026-05-31T10:00:00.000Z",
  endDate: "2026-05-31T11:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

// The query cache requires strict-contract `Event`s (unlike the draft
// itself, which is still legacy Schema_GridEvent-shaped per draft.store.ts's
// own TODO).
const toStrictEvent = (event: Schema_Event): Event =>
  createMockEvent({
    id: EventIdSchema.parse(event._id!),
    content: {
      kind: "details",
      title: event.title ?? "",
      description: event.description ?? "",
    },
    recurrence:
      Array.isArray(event.recurrence?.rule) && event.recurrence.rule.length > 0
        ? { kind: "series", rules: event.recurrence.rule }
        : { kind: "single" },
    schedule: EventScheduleSchema.parse({
      kind: "timed",
      start: event.startDate!,
      end: event.endDate!,
      timeZone: "UTC",
    }),
  });

const renderDraftConfirmation = ({
  draft = createDraft(),
  events = [],
  isInstance = false,
  isRecurrence = false,
  isSomeday = false,
}: {
  draft?: Schema_GridEvent;
  events?: Schema_Event[];
  isInstance?: boolean;
  isRecurrence?: boolean;
  isSomeday?: boolean;
} = {}) => {
  const discard = mock();
  const deleteEvent = mock();
  const submit = mock();
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    ["events", "week", { source: "local" }],
    normalizeEventList(events.map(toStrictEvent)),
  );
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const context = {
    actions: {
      discard,
      deleteEvent,
      isInstance: () => isInstance,
      isRecurrence: () => isRecurrence,
      isSomeday: () => isSomeday,
      submit,
    },
    state: {
      draft,
    },
  } as unknown as Parameters<typeof useDraftConfirmation>[0];

  const { result } = renderHook(() => useDraftConfirmation(context), {
    wrapper,
  });

  return { deleteEvent, discard, result, submit };
};

describe("useDraftConfirmation", () => {
  it("submits a new recurring draft without opening the update scope dialog", async () => {
    const draft = createDraft({
      _id: undefined,
      recurrence: {
        rule: ["FREQ=WEEKLY;COUNT=4"],
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({ draft });

    await act(async () => {
      await result.current.onSubmit(draft);
    });

    expect(result.current.isRecurrenceUpdateScopeDialogOpen).toBe(false);
    expect(result.current.finalDraft).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      draft,
      RecurringEventUpdateScope.THIS_EVENT,
    );
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it("opens the update scope dialog for existing multi-occurrence recurring instances", async () => {
    const baseEventId = new ObjectId().toString();
    const baseEvent = createDraft({
      _id: baseEventId,
      recurrence: {
        rule: ["FREQ=WEEKLY;COUNT=4"],
      },
    });
    const draft = createDraft({
      recurrence: {
        eventId: baseEventId,
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({
      draft,
      events: [baseEvent],
    });

    await act(async () => {
      await result.current.onSubmit(draft);
    });

    expect(result.current.isRecurrenceUpdateScopeDialogOpen).toBe(true);
    expect(result.current.finalDraft).toBe(draft);
    expect(submit).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
  });

  it("submits an existing standalone draft made recurring without opening the update scope dialog", async () => {
    const draft = createDraft({
      recurrence: {
        rule: ["FREQ=WEEKLY;COUNT=4"],
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({ draft });

    await act(async () => {
      await result.current.onSubmit(draft);
    });

    expect(result.current.isRecurrenceUpdateScopeDialogOpen).toBe(false);
    expect(result.current.finalDraft).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      draft,
      RecurringEventUpdateScope.THIS_EVENT,
    );
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it("submits a single-occurrence recurring instance without opening the update scope dialog", async () => {
    const baseEventId = new ObjectId().toString();
    const baseEvent = createDraft({
      _id: baseEventId,
      recurrence: {
        rule: ["RRULE:FREQ=WEEKLY;COUNT=1"],
      },
    });
    const draft = createDraft({
      recurrence: {
        eventId: baseEventId,
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({
      draft,
      events: [baseEvent],
    });

    await act(async () => {
      await result.current.onSubmit(draft);
    });

    expect(result.current.isRecurrenceUpdateScopeDialogOpen).toBe(false);
    expect(result.current.finalDraft).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      draft,
      RecurringEventUpdateScope.ALL_EVENTS,
    );
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it("opens the update scope dialog before deleting recurring timed drafts", async () => {
    const draft = createDraft({
      recurrence: {
        rule: ["RRULE:FREQ=WEEKLY;COUNT=4"],
      },
    });
    const { deleteEvent, discard, result } = renderDraftConfirmation({
      draft,
      isRecurrence: true,
    });

    await act(async () => {
      await result.current.onDelete();
    });

    expect(result.current.isRecurrenceUpdateScopeDialogOpen).toBe(true);
    expect(result.current.finalDraft).toBeNull();
    expect(deleteEvent).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();

    act(() => {
      result.current.onUpdateScopeChange(RecurringEventUpdateScope.ALL_EVENTS);
    });

    expect(deleteEvent).toHaveBeenCalledWith(
      RecurringEventUpdateScope.ALL_EVENTS,
    );
    expect(discard).toHaveBeenCalledTimes(1);
  });
});
