import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { type FC, useEffect } from "react";
import { track } from "@web/auth/posthog/track";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { CHECKLIST_ITEMS } from "@web/components/OnboardingChecklist/checklist.items";
import {
  checklistActions,
  selectChecklistCelebrating,
  selectChecklistCompleted,
  selectChecklistDone,
  useChecklistStore,
} from "@web/components/OnboardingChecklist/checklist.store";
import { useChecklistDetection } from "@web/components/OnboardingChecklist/useChecklistDetection";
import { hasSeenShortcutShowcase } from "@web/components/ShortcutShowcase/showcase.storage";
import {
  selectShowcaseActive,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

const CELEBRATE_DISMISS_MS = 4_000;

const ChecklistCard: FC = () => {
  const completed = useChecklistStore(selectChecklistCompleted);
  const isCelebrating = useChecklistStore(selectChecklistCelebrating);
  const { openModal } = useAuthModal();

  useEffect(() => {
    checklistActions.trackShownOnce();
  }, []);

  // Celebrate briefly, then disappear forever.
  useEffect(() => {
    if (!isCelebrating) return;
    const timer = window.setTimeout(
      checklistActions.finalizeCompleted,
      CELEBRATE_DISMISS_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isCelebrating]);

  const doneCount = CHECKLIST_ITEMS.filter((item) => completed[item.id]).length;

  return (
    <aside
      aria-label="Shortcut practice checklist"
      className="fixed right-6 bottom-6"
      data-onboarding-ui=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      <div className="w-72 rounded-xl border border-border bg-surface/95 px-4 py-3 text-text shadow-xl backdrop-blur-2xl backdrop-saturate-150">
        {isCelebrating ? (
          <div className="flex flex-col gap-1 py-2">
            <span className="font-semibold text-sm">That's everything.</span>
            <span className="text-text-muted text-xs">
              You're flying with the keyboard now.
            </span>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-sm">
                Practice on real events
              </span>
              <span className="text-text-muted text-xs">
                {doneCount}/{CHECKLIST_ITEMS.length}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {CHECKLIST_ITEMS.map((item) => {
                const isComplete = Boolean(completed[item.id]);
                const row = (
                  <>
                    {isComplete ? (
                      <CheckCircleIcon
                        className="shrink-0 text-accent"
                        size={16}
                        weight="fill"
                      />
                    ) : (
                      <CircleIcon
                        className="shrink-0 text-text-muted"
                        size={16}
                      />
                    )}
                    <span
                      className={
                        isComplete
                          ? "text-text-muted text-xs line-through"
                          : "text-text text-xs"
                      }
                    >
                      {item.label}
                    </span>
                    {item.keycaps && !isComplete && (
                      <ShortcutKeys
                        className="ml-auto"
                        keys={[...item.keycaps]}
                      />
                    )}
                  </>
                );
                return (
                  <li key={item.id} className="flex items-center gap-2">
                    {item.id === "signUp" && !isComplete ? (
                      <button
                        type="button"
                        className="c-focus-ring flex w-full items-center gap-2 rounded-md text-left hover:bg-surface-overlay"
                        onClick={() => {
                          track("signup_started", { source: "checklist" });
                          openModal("signUp");
                        }}
                      >
                        {row}
                      </button>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text"
                onClick={checklistActions.dismiss}
              >
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

/**
 * Non-blocking mission card shown in the real app once the showcase is done
 * (finished or skipped). Items auto-complete via loose detection; completing
 * everything celebrates and retires the card, dismissing retires it silently.
 */
export const OnboardingChecklist: FC = () => {
  const isShowcaseActive = useShortcutShowcaseStore(selectShowcaseActive);
  const isDone = useChecklistStore(selectChecklistDone);
  const isLive = !isDone && !isShowcaseActive && hasSeenShortcutShowcase();
  useChecklistDetection(isLive);
  if (!isLive) return null;
  return <ChecklistCard />;
};
