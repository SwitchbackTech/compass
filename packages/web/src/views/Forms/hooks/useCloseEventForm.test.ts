import { renderHook } from "@testing-library/react";
import {
  draftActions,
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useCloseEventForm } from "./useCloseEventForm";
import { describe, expect, it } from "bun:test";

describe("useCloseEventForm", () => {
  it("should discard the draft (which closes the form)", () => {
    draftActions.startGridClick({
      _id: "event-1",
      startDate: "2026-05-20T09:00:00.000Z",
      endDate: "2026-05-20T10:00:00.000Z",
    });
    draftActions.setFormOpen(true);

    const { result } = renderHook(() => useCloseEventForm());

    result.current();

    expect(useDraftStore.getState()).toEqual(initialDraftState);
  });
});
