import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { ObjectId } from "bson";
import { type PropsWithChildren } from "react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  type EditEventRecurrenceDraft,
  type GridEventDraft,
  type NewEventRecurrenceDraft,
} from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import { normalizeEventList } from "@web/events/queries/event.query.normalize";
import { useDraftConfirmation } from "./useDraftConfirmation";
import { describe, expect, it, mock } from "bun:test";

const SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2026-05-31T10:00:00.000Z",
  end: "2026-05-31T11:00:00.000Z",
  timeZone: "UTC",
});

const buildCreateDraft = (
  recurrence: NewEventRecurrenceDraft = { kind: "single" },
): GridEventDraft => {
  const draft = createGridEventDraft({
    kind: "timed",
    start: new Date("2026-05-31T10:00:00.000Z"),
    end: new Date("2026-05-31T11:00:00.000Z"),
    timeZone: "UTC",
  });
  if (draft.kind !== "create") throw new Error("Expected a create draft");

  return { ...draft, values: { ...draft.values, recurrence } };
};

const buildEditDraft = ({
  id = "0123456789abcdef01234567",
  recurrence = { kind: "single" },
  liveRecurrence = { kind: "preserve" },
}: {
  id?: string;
  recurrence?: Event["recurrence"];
  liveRecurrence?: EditEventRecurrenceDraft;
} = {}): GridEventDraft => {
  const source = createMockEvent({
    id: EventIdSchema.parse(id),
    recurrence,
    schedule: SCHEDULE,
  });
  const draft = editGridEventDraft(source);
  if (!draft || draft.kind !== "edit")
    throw new Error("Expected an edit draft");

  return { ...draft, values: { ...draft.values, recurrence: liveRecurrence } };
};

const renderDraftConfirmation = ({
  draft,
  seriesEvents = [],
  isInstance = false,
  isRecurrence = false,
}: {
  draft: GridEventDraft;
  seriesEvents?: Event[];
  isInstance?: boolean;
  isRecurrence?: boolean;
}) => {
  const discard = mock();
  const deleteEvent = mock();
  const submit = mock();
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    ["events", "week", { source: "local" }],
    normalizeEventList(seriesEvents),
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
    const draft = buildCreateDraft({
      kind: "series",
      rules: ["FREQ=WEEKLY;COUNT=4"],
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
    const baseEvent = createMockEvent({
      id: EventIdSchema.parse(baseEventId),
      recurrence: { kind: "series", rules: ["FREQ=WEEKLY;COUNT=4"] },
      schedule: SCHEDULE,
    });
    const draft = buildEditDraft({
      recurrence: {
        kind: "occurrence",
        seriesId: EventIdSchema.parse(baseEventId),
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({
      draft,
      seriesEvents: [baseEvent],
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
    const draft = buildEditDraft({
      recurrence: { kind: "single" },
      liveRecurrence: { kind: "series", rules: ["FREQ=WEEKLY;COUNT=4"] },
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
    const baseEvent = createMockEvent({
      id: EventIdSchema.parse(baseEventId),
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=1"] },
      schedule: SCHEDULE,
    });
    const draft = buildEditDraft({
      recurrence: {
        kind: "occurrence",
        seriesId: EventIdSchema.parse(baseEventId),
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({
      draft,
      seriesEvents: [baseEvent],
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
    const draft = buildEditDraft({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=4"] },
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
