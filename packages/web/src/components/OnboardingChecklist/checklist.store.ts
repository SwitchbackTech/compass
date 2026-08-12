import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import {
  CHECKLIST_ITEM_IDS,
  type ChecklistItemId,
} from "@web/components/OnboardingChecklist/checklist.items";
import {
  type ChecklistProgress,
  getChecklistDone,
  loadChecklistProgress,
  markChecklistDone,
  saveChecklistProgress,
} from "@web/components/OnboardingChecklist/checklist.storage";

export type ChecklistState = {
  completed: ChecklistProgress;
  isDone: boolean;
  /** All items just completed; the card celebrates before finalizing. */
  isCelebrating: boolean;
};

export const initialChecklistState: ChecklistState = {
  completed: {},
  isDone: false,
  isCelebrating: false,
};

/** Analytics-only once-per-session guard; nothing renders from it. */
let hasTrackedShown = false;

export const useChecklistStore = create<ChecklistState>()(() => ({
  ...initialChecklistState,
  completed: loadChecklistProgress(),
  isDone: getChecklistDone() !== null,
}));

const allItemsComplete = (completed: ChecklistProgress) =>
  CHECKLIST_ITEM_IDS.every((id) => completed[id]);

export const checklistActions = {
  /** Loose detection landed: persist immediately so credit is retroactive. */
  completeItem: (id: ChecklistItemId) => {
    const { completed, isDone } = useChecklistStore.getState();
    if (isDone || completed[id]) return;
    const next = { ...completed, [id]: true as const };
    saveChecklistProgress(next);
    track("checklist_item_completed", { item: id });
    if (allItemsComplete(next)) {
      track("checklist_completed");
      useChecklistStore.setState({ completed: next, isCelebrating: true });
      return;
    }
    useChecklistStore.setState({ completed: next });
  },
  /** Celebration finished: the card disappears forever. */
  finalizeCompleted: () => {
    markChecklistDone("completed");
    useChecklistStore.setState({ isDone: true, isCelebrating: false });
  },
  dismiss: () => {
    const { completed } = useChecklistStore.getState();
    const count = CHECKLIST_ITEM_IDS.filter((id) => completed[id]).length;
    track("checklist_dismissed", { items_completed: String(count) });
    markChecklistDone("dismissed");
    useChecklistStore.setState({ isDone: true, isCelebrating: false });
  },
  /** First visible render this session. */
  trackShownOnce: () => {
    if (hasTrackedShown) return;
    hasTrackedShown = true;
    track("checklist_shown");
  },
};

export const selectChecklistCompleted = (state: ChecklistState) =>
  state.completed;

export const selectChecklistDone = (state: ChecklistState) => state.isDone;

export const selectChecklistCelebrating = (state: ChecklistState) =>
  state.isCelebrating;
