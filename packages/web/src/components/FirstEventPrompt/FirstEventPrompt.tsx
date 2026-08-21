import { type FC, useEffect } from "react";
import { BANNER_DISMISS_MS } from "@web/common/constants/motion.constants";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  firstEventPromptActions,
  isShowcaseHandoffEligible,
  selectFirstEventCelebrating,
  selectFirstEventDone,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
import {
  selectHasSeenShowcase,
  selectShowcaseActive,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { KEYMAP } from "@web/shortcuts/keymap";

/** How long the celebration copy holds before it fades out for good. */
const CELEBRATE_HOLD_MS = 4_000;

const PromptCard: FC = () => {
  const isCelebrating = useFirstEventPromptStore(selectFirstEventCelebrating);
  const { closing, beginDismiss } = useDismissTransition(BANNER_DISMISS_MS);

  useEffect(() => {
    firstEventPromptActions.trackShownOnce();
  }, []);

  // Hold the celebration briefly, then fade out and disappear forever.
  useEffect(() => {
    if (!isCelebrating) return;
    const timer = window.setTimeout(() => {
      beginDismiss(firstEventPromptActions.finalizeCompleted);
    }, CELEBRATE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [isCelebrating, beginDismiss]);

  const dismiss = () => beginDismiss(firstEventPromptActions.dismiss);

  return (
    <aside
      aria-label="Create your first event"
      className="fixed right-6 bottom-6 starting:translate-y-2 starting:opacity-0 transition-all duration-300 data-closing:opacity-0 motion-reduce:transition-none"
      data-closing={closing || undefined}
      data-notice=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="w-72 rounded-xl border border-border bg-surface/95 px-4 py-3 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        {isCelebrating ? (
          <div className="flex flex-col gap-1 py-2">
            <span className="font-semibold text-sm">That's a real one.</span>
            <span className="text-text-muted text-xs">
              Your calendar is officially underway.
            </span>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="font-semibold text-sm">
                You've got the skills
              </span>
              <button
                aria-label="Dismiss"
                className="c-focus-ring shrink-0 rounded-xs px-1 text-text-muted text-xs hover:text-text"
                onClick={dismiss}
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs">
                Put them to use — press
              </span>
              <ShortcutKeys keys={[...KEYMAP.createEvent.keycaps]} />
              <span className="text-text-muted text-xs">
                to create your first real event.
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

/**
 * Non-blocking prompt shown in the real app once the showcase is done
 * (finished or skipped): the contextual handoff from practice to the real
 * product. Completes on the first genuine event create (see
 * noteFirstRealEventCreated in useEventMutations.ts), celebrates, and retires
 * the card forever. Dismissing retires it silently.
 */
export const FirstEventPrompt: FC = () => {
  const isShowcaseActive = useShortcutShowcaseStore(selectShowcaseActive);
  // The store flag covers a markSeen this session (storage notifies nobody);
  // the storage read covers earlier sessions and the legacy tour key.
  const seenThisSession = useShortcutShowcaseStore(selectHasSeenShowcase);
  const isDone = useFirstEventPromptStore(selectFirstEventDone);
  // Without storage (private mode), completion and dismissal can never
  // persist, so the card would haunt every reload; better to not show it.
  const isLive =
    !isDone &&
    persistentBrowserStore.isAvailable() &&
    isShowcaseHandoffEligible(isShowcaseActive, seenThisSession);
  if (!isLive) return null;
  return <PromptCard />;
};
