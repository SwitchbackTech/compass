import { type FC, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { Z_INDEX_FLOATING_MENU } from "@web/common/constants/web.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";
import { formatEventStatus } from "./UpNextCard";
import { useUpNextEvent } from "./useUpNextEvent";

const MINUTES_BEFORE_START = 2;

/**
 * A centered banner that surfaces the next timed event when it is about to
 * start, mirroring Vimcal. N opens the event's details; when the event has a
 * meeting link, the primary action switches to V for "Join" instead.
 */
const DISMISS_ANIMATION_MS = 200;

export const UpNextBanner: FC = () => {
  const { now, openEventDetails, upNext, conferenceUrl, isCurrentEvent } =
    useUpNextEvent();
  const [dismissedId, setDismissedId] = useState<string | undefined>(undefined);
  const [isClosing, setIsClosing] = useState(false);

  const isWithinWindow =
    Boolean(upNext) &&
    (isCurrentEvent ||
      dayjs(upNext?.startDate).diff(now, "minute", true) <=
        MINUTES_BEFORE_START);
  const isVisible = isWithinWindow && upNext?._id !== dismissedId;

  const openConference = () =>
    window.open(conferenceUrl, "_blank", "noopener,noreferrer");

  // Keeps the banner mounted for one fade-out beat instead of yanking it
  // instantly, matching ReleaseNotesPrompt's dismiss pattern.
  const dismiss = () => {
    if (isClosing) return;
    setIsClosing(true);
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.setTimeout(
      () => {
        setDismissedId(upNext?._id);
        setIsClosing(false);
      },
      reducedMotion ? 0 : DISMISS_ANIMATION_MS,
    );
  };

  useAppShortcutUp("N", () => openEventDetails("keyboardEdit"));
  useAppShortcutUp("V", openConference, {
    enabled: Boolean(conferenceUrl) && isWithinWindow,
  });
  // Only active while the banner itself is showing. Fires alongside any
  // other Escape handling (e.g. useEscapeToCloseForm closing the event form)
  // the same way every other Escape shortcut in the app does - Escape is
  // never scoped to "not while typing" here, matching that convention.
  useAppShortcutUp("Escape", dismiss, { enabled: isVisible });

  if (!isVisible || !upNext) {
    return null;
  }

  const countdown = formatEventStatus(
    dayjs(upNext.startDate),
    dayjs(upNext.endDate),
    now,
    isCurrentEvent,
  );

  return (
    <div
      aria-atomic="true"
      className="fixed bottom-6 left-1/2 flex w-72 -translate-x-1/2 starting:translate-y-2 items-center gap-3 rounded-lg border border-border bg-surface-panel/80 px-3 py-2 text-sm text-text starting:opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 ease-out data-closing:opacity-0 motion-reduce:transition-none"
      data-closing={isClosing || undefined}
      role="status"
      style={{ zIndex: Z_INDEX_FLOATING_MENU }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-text-muted text-xs">{countdown}</div>
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-accent"
          />
          <span className="truncate font-medium">{upNext.title}</span>
        </div>
      </div>
      <button
        className="c-focus-ring flex shrink-0 items-center gap-1.5 rounded bg-accent-secondary px-2 py-1 font-medium text-on-accent"
        onClick={
          conferenceUrl ? openConference : () => openEventDetails("gridClick")
        }
        type="button"
      >
        {conferenceUrl ? "Join" : "Open"}
        <ShortcutHint>{conferenceUrl ? "V" : "N"}</ShortcutHint>
      </button>
      <button
        aria-label="Dismiss"
        className="c-focus-ring shrink-0 rounded-xs px-1 text-text-muted hover:text-text"
        onClick={dismiss}
        type="button"
      >
        &times;
      </button>
    </div>
  );
};
