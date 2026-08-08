import { renderHook } from "@testing-library/react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  createGridEventDraft,
  editGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { WEEK_INTERACTION_EVENT_ID_ATTRIBUTE } from "@web/views/Week/interaction/registry/week-event.registry";
import { useCloseEventForm } from "./useCloseEventForm";
import { afterEach, describe, expect, it } from "bun:test";

const EXISTING_EVENT_ID = "507f1f77bcf86cd799439011";

afterEach(() => {
  draftActions.discard();
  document.body.innerHTML = "";
});

describe("useCloseEventForm", () => {
  it("should discard the draft (which closes the form)", () => {
    draftActions.startGridDraft({
      activity: "gridClick",
      draft: createGridEventDraft(
        timedGridSchedule(
          new Date("2026-05-20T09:00:00.000Z"),
          new Date("2026-05-20T10:00:00.000Z"),
        ),
      ),
    });
    draftActions.setFormOpen(true);

    const { result } = renderHook(() => useCloseEventForm());

    result.current();

    expect(useDraftStore.getState()).toEqual(initialDraftState);
  });

  it("restores focus to the grid event for the closed draft", () => {
    const existingEvent = createMockEvent({
      id: EventIdSchema.parse(EXISTING_EVENT_ID),
      content: {
        kind: "details",
        title: "Focus me",
        description: "",
      },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-05-20T14:00:00.000Z",
        end: "2026-05-20T15:00:00.000Z",
        timeZone: "UTC",
      }),
    });
    const draft = editGridEventDraft(existingEvent);
    if (!draft) throw new Error("expected an edit draft");

    const card = document.createElement("button");
    card.setAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE, EXISTING_EVENT_ID);
    card.tabIndex = 0;
    document.body.appendChild(card);

    draftActions.startGridDraft({ activity: "keyboardEdit", draft });
    draftActions.setFormOpen(true);

    const { result } = renderHook(() => useCloseEventForm());
    result.current();

    expect(useDraftStore.getState()).toEqual(initialDraftState);
    expect(document.activeElement).toBe(card);
  });
});
