import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { type DuplicateCopy } from "@web/common/types/web.event.types";
import { type NormalizedEventQueryData } from "./event.query.types";

interface Copy {
  id: EventId;
  event: Event;
  calendar: Calendar;
}

/** Trim and strip a `mailto:` prefix so provider copies correlate reliably. */
function correlationKey(icalUid: string): string {
  let key = icalUid.trim();
  if (key.toLowerCase().startsWith("mailto:")) {
    key = key.slice("mailto:".length).trim();
  }
  return key;
}

/**
 * Schedule part of the group key. Timed copies compare by instant: sync
 * formats each copy's start/end in that copy's own zone, so the same meeting
 * can arrive as `15:00+00:00` on one calendar and `17:00+02:00` on another.
 * All-day copies compare by date string, prefixed by kind so a timed and an
 * all-day copy never share a key.
 */
function scheduleKey(schedule: Event["schedule"]): string {
  const { kind, start, end } = schedule;
  if (kind === "allDay") return `allDay ${start} ${end}`;
  return `timed ${Date.parse(start)} ${Date.parse(end)}`;
}

/** Provider holiday feeds use names like "Holidays in United States" or "holidays-de". */
function isHolidayCalendar(calendar: Calendar): boolean {
  return /\bholiday/i.test(calendar.name);
}

function isSingleDayAllDay(schedule: Event["schedule"]): boolean {
  if (schedule.kind !== "allDay") return false;
  const nextDay = dayjs(schedule.start, "YYYY-MM-DD")
    .add(1, "day")
    .format("YYYY-MM-DD");
  return schedule.end === nextDay;
}

function normalizeHolidayTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function holidayTitleKey(event: Event): string | null {
  if (!isSingleDayAllDay(event.schedule)) return null;
  if (event.content.kind !== "details") return null;
  const normalized = normalizeHolidayTitle(event.content.title);
  return normalized.length > 0 ? normalized : null;
}

/**
 * How a dropped copy is named in the surviving card's accessible label: the
 * account it lives on when that is a different account, else its calendar
 * name. Naming the account for a same-account copy would say nothing ("also
 * on ahab@gmail.com" when the card is already on ahab@gmail.com).
 */
function copyLabel(copy: Copy, winner: Copy): string {
  const { accountEmail, name } = copy.calendar;
  return accountEmail && accountEmail !== winner.calendar.accountEmail
    ? accountEmail
    : name;
}

/**
 * Collapse copies of one meeting that live on two of the user's calendars
 * into a single event, and stamp `duplicateCopies` (surviving event id -> the
 * calendars the other copies came from) onto the returned data for the view
 * model to join onto each GridEvent as `otherCopies` - the same way
 * demoEventIds becomes isDemo.
 *
 * Every provider copy of the same invite carries the same `icalUid`, so two
 * events that share it, start and end at the same instant, and sit on
 * DIFFERENT calendars are one meeting seen twice - whether those calendars
 * belong to one connected account or two. Copies whose times differ are left
 * alone: one of them has genuinely been moved, so they occupy different slots
 * and both belong on the grid.
 *
 * Run this after the visible-calendar filter, so hiding one of the calendars
 * unmerges on its own (the hidden copy is already gone by the time this sees
 * the data), and before the grid view model, so everything downstream - the
 * grid and the Up Next banner alike - sees one event per meeting.
 *
 * Pure: useCalendarEventViewModel memoizes the whole pipeline this belongs to,
 * so there is nothing to cache here.
 */
export function mergeDuplicateCopies(
  data: NormalizedEventQueryData | undefined,
  calendars: Calendar[] | undefined,
  defaultAccountEmail = "",
): NormalizedEventQueryData | undefined {
  if (!data || !calendars) return data;

  // A duplicate needs two calendars to sit on. Skip the per-event pass
  // entirely when there is only one.
  if (calendars.length < 2) return data;

  const calendarsById = new Map(calendars.map((c) => [c.id, c]));
  const calendarOrder = new Map(calendars.map((c, i) => [c.id, i]));

  const dropped = new Set<EventId>();

  /**
   * Bucket the events a pass can merge by its own group key. An event with no
   * calendar, no key, or an earlier pass's drop can have no counterpart.
   */
  const groupCopies = (
    keyFor: (event: Event, calendar: Calendar) => string | null,
  ): Map<string, Copy[]> => {
    const groups = new Map<string, Copy[]>();
    for (const id of data.ids) {
      if (dropped.has(id)) continue;
      const event = data.entities[id];
      const calendar = event?.calendarId
        ? calendarsById.get(event.calendarId)
        : undefined;
      if (!event || !calendar) continue;
      const groupKey = keyFor(event, calendar);
      if (groupKey === null) continue;
      const copy: Copy = { id, event, calendar };
      const group = groups.get(groupKey);
      if (group) group.push(copy);
      else groups.set(groupKey, [copy]);
    }
    return groups;
  };

  const duplicates = new Map<EventId, DuplicateCopy[]>();

  const rank = (copy: Copy) =>
    copy.calendar.accountEmail === defaultAccountEmail
      ? -1
      : (calendarOrder.get(copy.calendar.id) ?? calendars.length);

  const mergeCopyGroup = (copies: Copy[]) => {
    if (copies.length < 2) return;
    // Two rows on the SAME calendar are never two copies of the meeting; the
    // id de-duplication in normalizeEventList already covers that case.
    if (new Set(copies.map((c) => c.calendar.id)).size < 2) return;

    const [winner, ...others] = [...copies].sort((a, b) => rank(a) - rank(b));
    if (!winner || others.length === 0) return;

    for (const loser of others) dropped.add(loser.id);

    // One accent stop per other calendar: two copies on the same calendar
    // would otherwise paint that color twice.
    const seen = new Set<CalendarId>([winner.calendar.id]);
    const otherCopies: DuplicateCopy[] = [];
    for (const other of others) {
      if (seen.has(other.calendar.id)) continue;
      seen.add(other.calendar.id);
      otherCopies.push({
        label: copyLabel(other, winner),
        backgroundColor: other.calendar.backgroundColor,
      });
    }
    if (otherCopies.length === 0) return;

    const existing = duplicates.get(winner.id);
    if (!existing) {
      duplicates.set(winner.id, otherCopies);
      return;
    }
    const seenLabels = new Set(existing.map((copy) => copy.label));
    duplicates.set(winner.id, [
      ...existing,
      ...otherCopies.filter((copy) => {
        if (seenLabels.has(copy.label)) return false;
        seenLabels.add(copy.label);
        return true;
      }),
    ]);
  };

  // Two copies can only merge when they share a correlation key and sit at the
  // same instant.
  const icalGroups = groupCopies((event) =>
    event.icalUid
      ? `${correlationKey(event.icalUid)} ${scheduleKey(event.schedule)}`
      : null,
  );
  for (const copies of icalGroups.values()) mergeCopyGroup(copies);

  // Public holiday feeds on different accounts often carry different
  // correlation keys for the same civil holiday. Collapse those when the
  // title and single-day all-day span match on holiday calendars.
  const holidayGroups = groupCopies((event, calendar) => {
    if (!isHolidayCalendar(calendar)) return null;
    const titleKey = holidayTitleKey(event);
    return titleKey ? `${titleKey} ${scheduleKey(event.schedule)}` : null;
  });
  for (const copies of holidayGroups.values()) mergeCopyGroup(copies);

  if (dropped.size === 0) return data;

  const ids = data.ids.filter((id) => !dropped.has(id));
  const entities = { ...data.entities };
  for (const id of dropped) delete entities[id];

  return { ...data, ids, entities, duplicateCopies: duplicates };
}
