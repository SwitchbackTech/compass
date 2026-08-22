import { type FC, useEffect, useState } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import {
  selectShowcaseActive,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { POINTER_ACTIONS } from "@web/shortcuts/keyboard-only/pointer-action";
import {
  selectLatestPointerAttempt,
  selectPointerBlockPulse,
  usePointerBlockStore,
} from "@web/shortcuts/keyboard-only/pointer-block.store";
import {
  selectEventJumpPointerHintKey,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";

const HINT_VISIBLE_MS = 2500;
const HINT_BRIEF_MS = 400;
const HINT_FULL_LIMIT = 3;
const HINT_COUNT_KEY = "compass.pointer-hint-count";

const readHintCount = () => {
  try {
    return Number(sessionStorage.getItem(HINT_COUNT_KEY) ?? "0");
  } catch {
    return 0;
  }
};

const writeHintCount = (count: number) => {
  try {
    sessionStorage.setItem(HINT_COUNT_KEY, String(count));
  } catch {
    // sessionStorage can throw in privacy modes; the hint still shows.
  }
};

/**
 * Teaches instead of silently ignoring: when a mouse click is blocked, a
 * transient pill explains the exact keyboard path for recognized targets and
 * falls back to the legend while coverage is expanded. Mounted in RootShell
 * so it shows with the sidebar closed too.
 * Top-center to stay clear of the Up Next banner's bottom-center spot.
 */
export const PointerHint: FC = () => {
  const pulse = usePointerBlockStore(selectPointerBlockPulse);
  const attempt = usePointerBlockStore(selectLatestPointerAttempt);
  const eventJumpKey = useEventJumpStore(selectEventJumpPointerHintKey);
  const showcaseActive = useShortcutShowcaseStore(selectShowcaseActive);
  const [isVisible, setIsVisible] = useState(false);
  const [isBrief, setIsBrief] = useState(false);

  useEffect(() => {
    if (pulse === 0) return;
    const next = readHintCount() + 1;
    writeHintCount(next);
    const brief = next > HINT_FULL_LIMIT;
    setIsBrief(brief);
    setIsVisible(true);
    const timer = window.setTimeout(
      () => setIsVisible(false),
      brief ? HINT_BRIEF_MS : HINT_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pulse]);

  if (!isVisible) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 starting:translate-y-1 rounded-lg border border-border bg-surface-panel/90 px-3 py-1.5 text-sm text-text starting:opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 ease-out motion-reduce:transition-none"
      data-pointer-hint=""
      role="status"
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      {showcaseActive ? (
        "Keyboard only. Follow the keys on screen."
      ) : attempt?.actionId === POINTER_ACTIONS.sidebarClose ? (
        <>
          Press <kbd className="c-keycap">]</kbd> to close the sidebar.
        </>
      ) : attempt?.actionId === POINTER_ACTIONS.sidebarOpen ? (
        <>
          Press <kbd className="c-keycap">]</kbd> to open the sidebar.
        </>
      ) : attempt?.actionId === POINTER_ACTIONS.eventOpen ? (
        eventJumpKey ? (
          <>
            Press <kbd className="c-keycap">{eventJumpKey}</kbd>, then{" "}
            <kbd className="c-keycap">Enter</kbd> to open this event.
          </>
        ) : (
          <>
            Press <kbd className="c-keycap">S</kbd> to reveal event shortcuts.
          </>
        )
      ) : isBrief ? (
        "Keyboard only."
      ) : (
        <>
          Compass is keyboard only. Press <kbd className="c-keycap">?</kbd> for
          shortcuts.
        </>
      )}
    </div>
  );
};
