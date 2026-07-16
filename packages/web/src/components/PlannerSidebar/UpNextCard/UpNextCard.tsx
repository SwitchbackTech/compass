import { type FC, useEffect, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useDayEventViewModel } from "@web/events/queries/useDayEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import { dayEventQueryRange } from "@web/views/Day/hooks/events/useDayEvents";

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
 * Re-renders once a minute so the countdown copy stays current, mirroring the
 * grid's now-line ticker (CalendarTimedGrid.tsx). Crossing midnight also rolls
 * the day query below onto the new day for free.
 */
function useMinuteTick(): Dayjs {
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, []);

  return now;
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
  const now = useMinuteTick();
  // Today's range explicitly, not the week/day in view - "Up next" means today
  // even while the user is looking at another week. Reusing the Day view's
  // range builder means this shares that view's cache entry when today is shown.
  const { startDate, endDate } = dayEventQueryRange(now);
  const { events, timedEvents } = useDayEventViewModel({ startDate, endDate });

  // The query range is [todayStart, tomorrowStart), so anything still ahead of
  // `now` within it starts later today - no separate same-day filter needed.
  const upNext = timedEvents
    .filter((event) => dayjs(event.startDate).isAfter(now))
    .sort(
      (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
    )[0];

  if (!upNext) return null;

  const countdown = formatStartsIn(dayjs(upNext.startDate), now);

  const openEventDetails = () => {
    const sourceEvent = events.find((candidate) => candidate.id === upNext._id);
    if (!sourceEvent) return;

    const draft = editGridEventDraft(sourceEvent);
    if (!draft) return;

    draftActions.startGridDraft({ activity: "gridClick", draft });
    draftActions.setFormOpen(true);
  };

  return (
    <section aria-label="Up next">
      <button
        aria-label={`Up next: ${upNext.title}. ${countdown}.`}
        className="c-focus-ring flex w-full min-w-0 flex-col gap-0.5 rounded border border-border-primary bg-bg-secondary px-2 py-1.5 text-left hover:brightness-110"
        onClick={openEventDetails}
        type="button"
      >
        <span className="text-accent-primary text-xs">{countdown}</span>
        <span className="min-w-0 truncate font-medium text-sm text-text-lighter">
          {upNext.title}
        </span>
      </button>
    </section>
  );
};
