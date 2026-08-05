import { type Calendar } from "@core/types/calendar.contracts";
import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { type CrossAccountDuplicate } from "@web/common/types/web.event.types";
import { type NormalizedEventQueryData } from "./event.query.types";

interface Copy {
  id: EventId;
  event: Event;
  accountEmail: string;
}

/**
 * Collapse copies of one meeting that live on two connected accounts into a
 * single event, and stamp `crossAccountDuplicates` (surviving event id -> the
 * other account) onto the returned data for the view model to join onto each
 * GridEvent as `otherAccount` - the same way demoEventIds becomes isDemo.
 *
 * Google gives every copy of a meeting the same `icalUid`, so two events that
 * share it, start and end at the same instant, and sit on calendars belonging
 * to DIFFERENT accounts are one meeting seen twice. Copies whose times differ
 * are left alone: one of them has genuinely been moved, so they occupy
 * different slots and both belong on the grid.
 *
 * Run this after the visible-calendar filter, so hiding one account's calendar
 * unmerges on its own (the hidden copy is already gone by the time this sees
 * the data), and before the grid view model, so everything downstream - the
 * grid and the Up Next banner alike - sees one event per meeting.
 *
 * Pure: useCalendarEventViewModel memoizes the whole pipeline this belongs to,
 * so there is nothing to cache here.
 */
export function mergeCrossAccountDuplicates(
  data: NormalizedEventQueryData | undefined,
  calendars: Calendar[] | undefined,
  defaultAccountEmail = "",
): NormalizedEventQueryData | undefined {
  if (!data || !calendars) return data;

  // Duplicates need two accounts; almost every user has one. Skip the
  // per-event pass entirely for them.
  const accountEmails = new Set(
    calendars.map((c) => c.accountEmail).filter(Boolean),
  );
  if (accountEmails.size < 2) return data;

  const calendarsById = new Map(calendars.map((c) => [c.id, c]));

  // Group only events that can possibly merge: they need a correlation key,
  // and an account to compare against another copy's.
  const groups = new Map<string, Copy[]>();
  for (const id of data.ids) {
    const event = data.entities[id];
    if (!event?.icalUid) continue;
    const accountEmail = calendarsById.get(event.calendarId)?.accountEmail;
    if (!accountEmail) continue;
    const { start, end } = event.schedule;
    const groupKey = `${event.icalUid} ${start} ${end}`;
    const copy: Copy = { id, event, accountEmail };
    const group = groups.get(groupKey);
    if (group) group.push(copy);
    else groups.set(groupKey, [copy]);
  }

  const dropped = new Set<EventId>();
  const duplicates = new Map<EventId, CrossAccountDuplicate>();

  for (const copies of groups.values()) {
    if (copies.length < 2) continue;
    // Two calendars on the SAME account can legitimately both hold a meeting
    // (an invite plus a copy the user made); that is not a cross-account
    // duplicate and both cards stay.
    if (new Set(copies.map((c) => c.accountEmail)).size < 2) continue;

    // Deterministic winner: the copy on the default calendar's account when
    // one of them is, else the copy whose calendar comes first in the
    // calendars list (the order the server returned, stable per cache entry).
    const rank = (copy: Copy) =>
      copy.accountEmail === defaultAccountEmail
        ? -1
        : calendars.findIndex((c) => c.id === copy.event.calendarId);
    const [winner, ...others] = [...copies].sort((a, b) => rank(a) - rank(b));
    const other = others[0];
    if (!winner || !other) continue;

    for (const loser of others) dropped.add(loser.id);

    const otherCalendar = calendarsById.get(other.event.calendarId);
    if (otherCalendar) {
      duplicates.set(winner.id, {
        accountEmail: other.accountEmail,
        backgroundColor: otherCalendar.backgroundColor,
      });
    }
  }

  if (dropped.size === 0) return data;

  const ids = data.ids.filter((id) => !dropped.has(id));
  const entities = { ...data.entities };
  for (const id of dropped) delete entities[id];

  return { ...data, ids, entities, crossAccountDuplicates: duplicates };
}
