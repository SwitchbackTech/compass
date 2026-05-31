import { act, renderHook } from "@testing-library/react";
import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
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

const renderDraftConfirmation = ({
  draft = createDraft(),
  isInstance = false,
  isRecurrence = false,
  isSomeday = false,
}: {
  draft?: Schema_GridEvent;
  isInstance?: boolean;
  isRecurrence?: boolean;
  isSomeday?: boolean;
} = {}) => {
  const discard = mock();
  const deleteEvent = mock();
  const submit = mock();

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

  const { result } = renderHook(() => useDraftConfirmation(context));

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

  it("opens the update scope dialog for existing multi-occurrence recurring drafts", async () => {
    const draft = createDraft({
      recurrence: {
        eventId: new ObjectId().toString(),
        rule: ["FREQ=WEEKLY;COUNT=4"],
      },
    });
    const { discard, result, submit } = renderDraftConfirmation({ draft });

    await act(async () => {
      await result.current.onSubmit(draft);
    });

    expect(result.current.isRecurrenceUpdateScopeDialogOpen).toBe(true);
    expect(result.current.finalDraft).toBe(draft);
    expect(submit).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
  });

  it("submits a single-occurrence recurring draft without opening the update scope dialog", async () => {
    const draft = createDraft({
      recurrence: {
        eventId: new ObjectId().toString(),
        rule: ["RRULE:FREQ=WEEKLY;COUNT=1"],
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
      RecurringEventUpdateScope.ALL_EVENTS,
    );
    expect(discard).toHaveBeenCalledTimes(1);
  });
});
