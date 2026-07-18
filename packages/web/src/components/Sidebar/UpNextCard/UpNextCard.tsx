import { type FC } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { useUpNextEvent } from "./useUpNextEvent";

/**
 * Countdown copy for the card's top row. Only ever called with a start that is
 * still ahead of `now` (the card drops an event the moment it begins), so
 * there's no "already started" branch - the sub-minute case reads "Starts now".
 */
export function formatStartsIn(start: Dayjs, now: Dayjs): string {
  const minutes = Math.round(start.diff(now, "minute", true));
  if (minutes <= 0) return "Starts now";
  if (minutes < 60) {
    return `Starts in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = Math.round(minutes / 60);
  return `Starts in ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * The next timed event starting later today, with a live countdown. Clicking it
 * opens the event in the sidebar's details form. Renders nothing once today has
 * no upcoming timed events left.
 *
 * All-day events are excluded by construction: the view model's `timedEvents`
 * projection already splits them out, and "Starts in X minutes" is meaningless
 * for them.
 */
export const UpNextCard: FC = () => {
  const { now, openEventDetails, upNext } = useUpNextEvent();

  if (!upNext) return null;

  const countdown = formatStartsIn(dayjs(upNext.startDate), now);

  return (
    <section aria-label="Up next">
      <button
        aria-label={`Up next: ${upNext.title}. ${countdown}.`}
        className="c-focus-ring group relative flex w-full min-w-0 flex-col gap-0.5 rounded border border-border bg-surface px-2 py-1.5 text-left hover:brightness-110"
        onClick={() => openEventDetails("gridClick")}
        type="button"
      >
        <span className="pr-8 text-accent text-xs">{countdown}</span>
        <ShortcutHint className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          N
        </ShortcutHint>
        <span className="min-w-0 truncate font-medium text-sm text-text">
          {upNext.title}
        </span>
      </button>
    </section>
  );
};
