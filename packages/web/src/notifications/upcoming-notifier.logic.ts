import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type NotificationPort } from "@web/notifications/notification.port";
import { inEffectiveTimeZone } from "@web/timezone/in-time-zone";

/** Fixed lead time. Long enough to walk to a meeting, short enough to be news. */
export const NOTIFY_LEAD_MINUTES = 5;

const FIRED_KEY_TTL_HOURS = 24;

/** The subset of a GridEvent this module needs; keeps the logic testable. */
export interface NotifiableEvent {
  _id: string;
  title?: string;
  startDate: string;
}

/**
 * Start time is part of the key, not just the id: rescheduling an event should
 * earn a fresh notification at its new time. Recurring occurrences already
 * carry distinct ids, so they never collide.
 */
export function notificationKey(event: NotifiableEvent): string {
  return `${event._id}|${event.startDate}`;
}

/**
 * Events starting within the lead window that have not been announced yet.
 *
 * Already-started events are excluded on purpose: after a laptop wakes, the
 * tick catches up all at once, and a burst of notifications for meetings that
 * began an hour ago is noise. The in-app UpNextBanner covers "happening now".
 */
export function selectEventsToNotify(
  now: Dayjs,
  events: readonly NotifiableEvent[],
  firedKeys: ReadonlySet<string>,
): NotifiableEvent[] {
  return events
    .filter((event) => {
      if (firedKeys.has(notificationKey(event))) return false;
      const minutesUntilStart = dayjs(event.startDate).diff(
        now,
        "minute",
        true,
      );
      return minutesUntilStart >= 0 && minutesUntilStart <= NOTIFY_LEAD_MINUTES;
    })
    .sort(
      (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
    );
}

/**
 * Drop keys for events that are long past so a tab left open for days does not
 * grow the set without bound.
 */
export function pruneFiredKeys(
  firedKeys: ReadonlySet<string>,
  now: Dayjs,
): Set<string> {
  const cutoff = now.subtract(FIRED_KEY_TTL_HOURS, "hour");
  return new Set(
    [...firedKeys].filter((key) => {
      const startDate = key.slice(key.indexOf("|") + 1);
      const start = dayjs(startDate);
      // An unparseable key can never match a real event again; drop it.
      return start.isValid() && start.isAfter(cutoff);
    }),
  );
}

/**
 * Announce everything due and return the keys announced so far. Keeping this
 * out of the hook means the notification a user actually sees - its title,
 * its wording, and the fact that it fires exactly once - is testable without
 * a React tree.
 */
export function announceUpcomingEvents(
  port: NotificationPort,
  now: Dayjs,
  events: readonly NotifiableEvent[],
  firedKeys: ReadonlySet<string>,
): Set<string> {
  const due = selectEventsToNotify(now, events, firedKeys);
  if (due.length === 0) return new Set(firedKeys);

  const announced = pruneFiredKeys(firedKeys, now);
  for (const event of due) {
    const key = notificationKey(event);
    port.show(event.title?.trim() || "Untitled event", {
      body: `Starts at ${inEffectiveTimeZone(event.startDate).format("h:mm A")}`,
      // Same value as the de-dupe key, so a reload inside the lead window
      // replaces the earlier notification instead of stacking a second.
      tag: key,
      onClick: () => window.focus(),
    });
    announced.add(key);
  }
  return announced;
}
