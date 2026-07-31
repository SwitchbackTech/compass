import {
  registerToastPort,
  resetToastPort,
  type ToastApi,
} from "@web/common/utils/toast/toast.port";
import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { dismissExistingDraft } from "@web/grid/hooks/dismissExistingDraft";
import { afterEach, describe, expect, it, mock } from "bun:test";

const toast = Object.assign(mock(), { update: mock() }) as unknown as ToastApi;

afterEach(() => {
  resetToastPort();
  useDraftStore.setState({ gridDraft: null, status: null });
});

describe("dismissExistingDraft", () => {
  it("discards the draft and confirms the action", () => {
    registerToastPort({ toast });
    const draft = createGridEventDraft({
      kind: "allDay",
      start: new Date("2026-05-20"),
      end: new Date("2026-05-21"),
    });
    draftActions.startGridDraft({ activity: "gridClick", draft });

    dismissExistingDraft();

    expect(useDraftStore.getState().gridDraft).toBeNull();
    expect(toast).toHaveBeenCalledWith(
      "Discarded the unfinished event.",
      expect.objectContaining({ toastId: "discarded-grid-draft" }),
    );
  });
});
