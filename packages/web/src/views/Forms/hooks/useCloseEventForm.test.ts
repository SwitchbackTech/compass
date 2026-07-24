import { renderHook } from "@testing-library/react";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useCloseEventForm } from "./useCloseEventForm";
import { describe, expect, it } from "bun:test";

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
});
