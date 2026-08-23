import { type FC, type ReactNode, useEffect, useState } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import {
  selectShowcaseActive,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import {
  type BlockedPointerAttempt,
  POINTER_ACTIONS,
} from "@web/shortcuts/keyboard-only/pointer-action";
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

const Key = ({ children }: { children: string }) => (
  <kbd className="c-keycap">{children}</kbd>
);

const pointerHintMessage = ({
  attempt,
  eventJumpKey,
  isBrief,
  showcaseActive,
}: {
  attempt: BlockedPointerAttempt | null;
  eventJumpKey: string | null;
  isBrief: boolean;
  showcaseActive: boolean;
}): ReactNode => {
  if (showcaseActive) return "Keyboard only. Follow the keys on screen.";

  if (
    attempt?.actionId === POINTER_ACTIONS.sidebarClose ||
    attempt?.actionId === POINTER_ACTIONS.sidebarOpen
  ) {
    const verb =
      attempt.actionId === POINTER_ACTIONS.sidebarClose ? "close" : "open";
    return (
      <>
        Press <Key>]</Key> to {verb} the sidebar.
      </>
    );
  }

  if (attempt?.actionId === POINTER_ACTIONS.eventOpen) {
    if (!eventJumpKey) {
      return (
        <>
          Press <Key>S</Key> to reveal event shortcuts.
        </>
      );
    }
    return (
      <>
        Press <Key>{eventJumpKey}</Key>, then <Key>Enter</Key> to open this
        event.
      </>
    );
  }

  if (isBrief) return "Keyboard only.";

  return (
    <>
      Compass is keyboard only. Press <Key>?</Key> for shortcuts.
    </>
  );
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
      {pointerHintMessage({
        attempt,
        eventJumpKey,
        isBrief,
        showcaseActive,
      })}
    </div>
  );
};
