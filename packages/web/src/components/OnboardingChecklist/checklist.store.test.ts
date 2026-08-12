import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { CHECKLIST_ITEM_IDS } from "@web/components/OnboardingChecklist/checklist.items";
import { loadChecklistProgress } from "@web/components/OnboardingChecklist/checklist.storage";
import {
  checklistActions,
  initialChecklistState,
  useChecklistStore,
} from "@web/components/OnboardingChecklist/checklist.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("checklistActions", () => {
  beforeEach(() => {
    useChecklistStore.setState({ ...initialChecklistState });
    persistentBrowserStore.set(STORAGE_KEYS.CHECKLIST_PROGRESS, "");
    persistentBrowserStore.set(STORAGE_KEYS.CHECKLIST_DONE, "");
  });

  it("persists each completion immediately for retroactive credit", () => {
    checklistActions.completeItem("undo");
    expect(useChecklistStore.getState().completed.undo).toBe(true);
    expect(loadChecklistProgress()).toEqual({ undo: true });

    // Re-completing is a no-op, not a duplicate track/persist.
    checklistActions.completeItem("undo");
    expect(loadChecklistProgress()).toEqual({ undo: true });
  });

  it("celebrates when the last item lands, then finalizes forever", () => {
    for (const id of CHECKLIST_ITEM_IDS) {
      checklistActions.completeItem(id);
    }
    expect(useChecklistStore.getState().isCelebrating).toBe(true);
    expect(useChecklistStore.getState().isDone).toBe(false);

    checklistActions.finalizeCompleted();
    expect(useChecklistStore.getState().isDone).toBe(true);
    expect(persistentBrowserStore.get(STORAGE_KEYS.CHECKLIST_DONE)).toBe(
      "completed",
    );
  });

  it("dismiss retires the card and records how far the user got", () => {
    checklistActions.completeItem("moveEvent");
    checklistActions.dismiss();
    expect(useChecklistStore.getState().isDone).toBe(true);
    expect(persistentBrowserStore.get(STORAGE_KEYS.CHECKLIST_DONE)).toBe(
      "dismissed",
    );

    // Done means done: later detections change nothing.
    checklistActions.completeItem("undo");
    expect(useChecklistStore.getState().completed.undo).toBeUndefined();
  });

  it("ignores garbage in the persisted progress blob", () => {
    persistentBrowserStore.set(STORAGE_KEYS.CHECKLIST_PROGRESS, "{not json");
    expect(loadChecklistProgress()).toEqual({});
    persistentBrowserStore.set(
      STORAGE_KEYS.CHECKLIST_PROGRESS,
      JSON.stringify({ undo: true, bogusItem: true, moveEvent: "yes" }),
    );
    expect(loadChecklistProgress()).toEqual({ undo: true });
  });
});
