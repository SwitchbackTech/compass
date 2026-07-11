import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  initialDraftState,
  selectGridDraft,
  useDraftStore,
} from "./draft.store";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  useDraftStore.setState(initialDraftState, true);
});

describe("draftActions.startGridDraft", () => {
  it("stores the canonical draft and projects it for legacy consumers", () => {
    const draft = createGridEventDraft({
      kind: "allDay",
      start: new Date("2026-05-20"),
      end: new Date("2026-05-21"),
    });

    draftActions.startGridDraft({ activity: "gridClick", draft });

    const state = useDraftStore.getState();
    expect(selectGridDraft(state)).toBe(draft);
    expect(state.event).toMatchObject({
      endDate: "2026-05-21",
      isAllDay: true,
      startDate: "2026-05-20",
    });
  });
});
