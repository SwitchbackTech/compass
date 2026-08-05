import { type Calendar } from "@core/types/calendar.contracts";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";

export function getLocalCalendar(calendars: Calendar[]): Calendar | undefined {
  return calendars.find((calendar) => calendar.provider === "local");
}

/**
 * The one order every calendar surface shows: by account in connection order,
 * then that account's primary first, then alphabetically. A calendar with no
 * account (the local one) or an account that isn't connected sorts last.
 *
 * Shared so the sidebar list, the Settings default-calendar picker and the
 * event form's picker can't drift - they did, when each had its own
 * comparator claiming to mirror the others.
 */
export function compareCalendars(
  accountEmailOrder: readonly string[],
): (a: Calendar, b: Calendar) => number {
  const accountRank = (calendar: Calendar): number => {
    const index = calendar.accountEmail
      ? accountEmailOrder.indexOf(calendar.accountEmail)
      : -1;
    return index === -1 ? accountEmailOrder.length : index;
  };

  return (a, b) => {
    const byAccount = accountRank(a) - accountRank(b);
    if (byAccount !== 0) return byAccount;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.name.localeCompare(b.name);
  };
}

/**
 * True when these calendars span more than one account, so naming the account
 * on a row tells the user something. With one account every row would say the
 * same thing.
 */
export function spansMultipleAccounts(calendars: Calendar[]): boolean {
  return (
    new Set(calendars.map((calendar) => calendar.accountEmail).filter(Boolean))
      .size > 1
  );
}

export interface AccountGroup {
  accountEmail: string;
  connection: GoogleSyncConnectionSummary | undefined;
  calendars: Calendar[];
}

/**
 * Bucket calendars by the account they belong to, in connection order, with
 * anything lacking an account email (the local calendar) left ungrouped.
 * Callers render `ungrouped` after the groups, matching {@link
 * compareCalendars}, which sorts accountless calendars last.
 */
export function groupCalendarsByAccount(
  calendars: Calendar[],
  connections: GoogleSyncConnectionSummary[],
): { groups: AccountGroup[]; ungrouped: Calendar[] } {
  const groups: AccountGroup[] = [];
  const byEmail = new Map<string, AccountGroup>();
  const ungrouped: Calendar[] = [];

  // Seed in connection order so accounts appear oldest-connected first,
  // regardless of the order calendars came back in.
  for (const connection of connections) {
    const { accountEmail } = connection;
    if (!accountEmail || byEmail.has(accountEmail)) continue;
    const group: AccountGroup = { accountEmail, connection, calendars: [] };
    byEmail.set(accountEmail, group);
    groups.push(group);
  }

  for (const calendar of calendars) {
    const { accountEmail } = calendar;
    if (!accountEmail) {
      ungrouped.push(calendar);
      continue;
    }
    let group = byEmail.get(accountEmail);
    if (!group) {
      // A calendar whose account has no connection summary yet (metadata and
      // the calendar list can load a moment apart). Still give it a section.
      group = { accountEmail, connection: undefined, calendars: [] };
      byEmail.set(accountEmail, group);
      groups.push(group);
    }
    group.calendars.push(calendar);
  }

  // An account can be connected before its calendars have imported; an empty
  // section would render a heading with nothing under it.
  return { groups: groups.filter((g) => g.calendars.length > 0), ungrouped };
}

export interface DefaultTargetCalendarOptions {
  /**
   * The calendar the user chose as their default in Settings. Ignored when it
   * names a calendar that is gone or no longer writable, so a stale
   * preference degrades to the derived default instead of breaking event
   * creation.
   */
  preferredCalendarId?: string | null;
  /**
   * Connected account emails in connection order. With two accounts, both
   * have a primary calendar, so "first primary wins" would pick whichever
   * happened to sort first; this makes the oldest-connected account win.
   */
  accountEmailOrder?: readonly string[];
}

const isWritableGoogleCalendar = (calendar: Calendar): boolean =>
  calendar.provider === "google" && calendar.capabilities.canWrite;

/**
 * Where a new event lands: the user's chosen default if it is still usable,
 * else the primary calendar of the oldest-connected account, else the local
 * calendar (offline/anonymous mode, or a Google account with no primary the
 * user can write to).
 */
export function getDefaultTargetCalendar(
  calendars: Calendar[],
  options: DefaultTargetCalendarOptions = {},
): Calendar | undefined {
  const { preferredCalendarId, accountEmailOrder = [] } = options;

  const preferred = preferredCalendarId
    ? calendars.find((calendar) => calendar.id === preferredCalendarId)
    : undefined;
  // The local calendar is a valid explicit choice even though it is not a
  // writable *Google* calendar.
  if (preferred?.capabilities.canWrite) {
    return preferred;
  }

  const primaries = calendars.filter(
    (calendar) => calendar.isPrimary && isWritableGoogleCalendar(calendar),
  );
  const byConnectionOrder = accountEmailOrder
    .map((email) =>
      primaries.find((calendar) => calendar.accountEmail === email),
    )
    .find(Boolean);

  return byConnectionOrder ?? primaries[0] ?? getLocalCalendar(calendars);
}
