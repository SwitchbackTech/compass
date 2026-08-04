import { type FC, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { Z_INDEX_FLOATING_MENU } from "@web/common/constants/web.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";
import { formatStartsIn } from "./UpNextCard";
import { useUpNextEvent } from "./useUpNextEvent";

const MINUTES_BEFORE_START = 2;

/**
 * A centered banner that surfaces the next timed event when it is about to
 * start, mirroring Vimcal. N opens the event's details; when the event has a
 * meeting link, the primary action switches to V for "Join" instead.
 */
export const UpNextBanner: FC = () => {
  const { now, openEventDetails, upNext, conferenceUrl } = useUpNextEvent();
  const [dismissedId, setDismissedId] = useState<string | undefined>(undefined);

  const isWithinWindow =
    Boolean(upNext) &&
    dayjs(upNext?.startDate).diff(now, "minute", true) <= MINUTES_BEFORE_START;
  const isVisible = isWithinWindow && upNext?._id !== dismissedId;

  const openConference = () =>
    window.open(conferenceUrl, "_blank", "noopener,noreferrer");

  useAppShortcutUp("N", () => openEventDetails("keyboardEdit"));
  useAppShortcutUp("V", openConference, {
    enabled: Boolean(conferenceUrl) && isWithinWindow,
  });
  // Only active while the banner itself is showing. Fires alongside any
  // other Escape handling (e.g. useEscapeToCloseForm closing the event form)
  // the same way every other Escape shortcut in the app does - Escape is
  // never scoped to "not while typing" here, matching that convention.
  useAppShortcutUp("Escape", () => setDismissedId(upNext?._id), {
    enabled: isVisible,
  });

  if (!isVisible || !upNext) {
    return null;
  }

  const countdown = formatStartsIn(dayjs(upNext.startDate), now);

  return (
    <div
      className="fixed bottom-6 left-1/2 flex w-72 -translate-x-1/2 items-center gap-3 rounded border border-border bg-surface-overlay px-3 py-2 text-sm text-text shadow-lg"
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
        onClick={() => setDismissedId(upNext._id)}
        type="button"
      >
        &times;
      </button>
    </div>
  );
};
