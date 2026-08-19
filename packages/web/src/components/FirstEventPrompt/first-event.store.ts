import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  getFirstEventDone,
  markFirstEventDone,
} from "@web/components/FirstEventPrompt/first-event.storage";
import { hasSeenShortcutShowcase } from "@web/components/ShortcutShowcase/showcase.storage";
import {
  selectHasSeenShowcase,
  selectShowcaseActive,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";

export type FirstEventPromptState = {
  isDone: boolean;
  /** The real event just landed; the card celebrates before finalizing. */
  isCelebrating: boolean;
};

export const initialFirstEventPromptState: FirstEventPromptState = {
  isDone: false,
  isCelebrating: false,
};

/** Analytics-only once-per-session guard; nothing renders from it. */
let hasTrackedShown = false;

export const useFirstEventPromptStore = create<FirstEventPromptState>()(() => ({
  ...initialFirstEventPromptState,
  isDone: getFirstEventDone() !== null,
}));

/** Same eligibility the card itself renders under - see FirstEventPrompt.tsx. */
const isEligible = (): boolean => {
  const showcase = useShortcutShowcaseStore.getState();
  if (selectShowcaseActive(showcase)) return false;
  return selectHasSeenShowcase(showcase) || hasSeenShortcutShowcase();
};

export const firstEventPromptActions = {
  /**
   * Called from the create-event mutation funnel on every genuine create
   * (undo/redo replays and demo seeds never reach it). Only the first one
   * that lands while the prompt is relevant completes it.
   */
  noteRealEventCreated: () => {
    const { isDone, isCelebrating } = useFirstEventPromptStore.getState();
    if (isDone || isCelebrating) return;
    if (!persistentBrowserStore.isAvailable()) return;
    if (!isEligible()) return;
    markFirstEventDone("completed");
    track("first_event_prompt_completed");
    useFirstEventPromptStore.setState({ isCelebrating: true });
  },
  /** Celebration finished: the card disappears forever. */
  finalizeCompleted: () => {
    useFirstEventPromptStore.setState({ isDone: true, isCelebrating: false });
  },
  dismiss: () => {
    track("first_event_prompt_dismissed");
    markFirstEventDone("dismissed");
    useFirstEventPromptStore.setState({ isDone: true, isCelebrating: false });
  },
  /** First visible render this session. */
  trackShownOnce: () => {
    if (hasTrackedShown) return;
    hasTrackedShown = true;
    track("first_event_prompt_shown");
  },
};

/**
 * Standalone export for the create-event mutation funnel, so that hook
 * doesn't need to import the whole actions object for one call.
 */
export const noteFirstRealEventCreated =
  firstEventPromptActions.noteRealEventCreated;

export const selectFirstEventDone = (state: FirstEventPromptState) =>
  state.isDone;

export const selectFirstEventCelebrating = (state: FirstEventPromptState) =>
  state.isCelebrating;
