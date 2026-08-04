import { StarIcon } from "@phosphor-icons/react";
import { type FC } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { useSession } from "@web/auth/compass/session/useSession";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { setDefaultCalendarId } from "@web/calendars/default-calendar.store";
import { useCalendarVisibility } from "@web/calendars/useCalendarVisibility";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { AccountSectionHeader } from "./AccountSectionHeader";
import { CalendarListHeader } from "./CalendarListHeader";

// Primary calendars first, then alphabetical by name; the local calendar
// (offline/anonymous synthesized calendar, or the server's own local
// calendar once signed in) always sorts last since it isn't a
// provider-backed subscription like the others (packet 08 step 2).
function sortCalendars(calendars: Calendar[]): Calendar[] {
  return [...calendars].sort((a, b) => {
    if (a.provider === "local" && b.provider !== "local") return 1;
    if (b.provider === "local" && a.provider !== "local") return -1;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface AccountGroup {
  accountEmail: string;
  connection: GoogleSyncConnectionSummary | undefined;
  calendars: Calendar[];
}

/**
 * Bucket calendars by the account they belong to, in connection order, with
 * anything lacking an account email (the local calendar) left ungrouped.
 *
 * Grouping only earns its keep once a second account exists: with one account
 * the list heading already names it, so a single labelled section would just
 * repeat the heading. Callers render the flat list whenever this returns
 * fewer than two groups.
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

interface Props {
  /** Test seam only: lets list tests stub the account header's auth/sync hooks. */
  Header?: FC;
}

export const CalendarList: FC<Props> = ({ Header = CalendarListHeader }) => {
  const { authenticated } = useSession();
  const { connect, isAvailable, isConnecting, state } = useConnectGoogle();
  const { data, isPending, isError, refetch } = useCalendarsQuery();
  const { toggleCalendarVisibility, failureAnnouncement } =
    useCalendarVisibility();
  const connections = useUserMetadataStore(selectGoogleSyncConnections);

  const calendars = sortCalendars(
    (data ?? []).filter((calendar) => calendar.isActive),
  );
  const defaultTargetCalendarId = useDefaultTargetCalendar(calendars)?.id;
  const { groups, ungrouped } = groupCalendarsByAccount(calendars, connections);
  const showAccountSections = groups.length > 1;

  const renderRows = (rows: Calendar[]) => (
    <ul className="flex flex-col gap-1.5">
      {rows.map((calendar) => (
        <CalendarRow
          calendar={calendar}
          isDefaultTarget={calendar.id === defaultTargetCalendarId}
          key={calendar.id}
          onToggle={toggleCalendarVisibility}
        />
      ))}
    </ul>
  );

  return (
    <section aria-label="Calendars">
      {/* The generic single-account banner (email + connection status +
          connect/reconnect) is redundant once account sections take over -
          it always reflects the Compass login's own Google account (A7
          adopts it as a connection at sign-up), which is always one of the
          sections below, so showing both duplicates one section's status
          under a second, unlabeled heading with no way to tell them apart.
          Anonymous/no-accounts users never reach showAccountSections, so
          this never hides the sign-up-prompt header they still need. */}
      {!showAccountSections && <Header />}

      {isPending ? (
        <p className="text-text-muted text-xs">Loading calendars…</p>
      ) : isError ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="text-error">Couldn't load calendars.</p>
          <button
            className="c-focus-ring rounded-xs px-1.5 py-0.5 text-accent hover:brightness-110"
            onClick={() => void refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : calendars.length === 0 ? (
        <p className="text-text-muted text-xs">
          {authenticated && state === "NOT_CONNECTED" && isAvailable
            ? "Connect Google to see your calendars."
            : "No calendars yet."}
        </p>
      ) : showAccountSections ? (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <section
              aria-label={`Calendars for ${group.accountEmail}`}
              key={group.accountEmail}
            >
              <AccountSectionHeader
                accountEmail={group.accountEmail}
                connection={group.connection}
              />
              {renderRows(group.calendars)}
            </section>
          ))}
          {ungrouped.length > 0 ? renderRows(ungrouped) : null}
        </div>
      ) : (
        renderRows(calendars)
      )}

      {/* Adding a second account is only meaningful once the first one is
          connected; before that the header's own Connect action covers it. */}
      {authenticated &&
      isAvailable &&
      (state === "HEALTHY" || state === "IMPORTING") ? (
        <button
          aria-busy={isConnecting || undefined}
          className="c-focus-ring mt-3 rounded-xs px-1 py-0.5 text-accent text-xs hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
          disabled={isConnecting}
          onClick={connect}
          type="button"
        >
          {isConnecting ? "Opening Google…" : "Add account"}
        </button>
      ) : null}

      <span aria-live="polite" className="sr-only" role="status">
        {failureAnnouncement}
      </span>
    </section>
  );
};

const CalendarRow: FC<{
  calendar: Calendar;
  isDefaultTarget: boolean;
  onToggle: (calendarId: Calendar["id"], isVisible: boolean) => void;
}> = ({ calendar, isDefaultTarget, onToggle }) => {
  // The heading above the row already names the account (the list heading with
  // one account, the section heading with several), so a primary calendar's
  // row reads "primary" instead of repeating it. The anonymous local sentinel
  // is also isPrimary, but a lone "primary" row under a "Temporary account"
  // header reads wrong - keep its own name.
  const displayName =
    calendar.isPrimary && calendar.provider !== "local"
      ? "primary"
      : calendar.name;

  return (
    <li className="group/row flex min-w-0 items-center gap-1">
      <button
        aria-label={`${calendar.isVisible ? "Hide" : "Show"} ${displayName} calendar`}
        aria-pressed={calendar.isVisible}
        className="c-focus-ring group flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-text text-xs hover:bg-surface-panel"
        onClick={() => onToggle(calendar.id, !calendar.isVisible)}
        type="button"
      >
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full border-2 transition-[background-color,border-color] motion-reduce:transition-none"
          style={{
            backgroundColor: calendar.isVisible
              ? calendar.backgroundColor
              : "transparent",
            borderColor: calendar.backgroundColor,
          }}
        />
        <span className="min-w-0 flex-1 truncate">{displayName}</span>
      </button>
      {calendar.capabilities.canWrite ? (
        <DefaultCalendarStar
          calendar={calendar}
          displayName={displayName}
          isDefaultTarget={isDefaultTarget}
        />
      ) : null}
    </li>
  );
};

/**
 * Marks one calendar as where new events go. Starring another calendar moves
 * the default; starring the current default clears it, falling back to the
 * derived default. Only offered on calendars the user can write to.
 */
const DefaultCalendarStar: FC<{
  calendar: Calendar;
  displayName: string;
  isDefaultTarget: boolean;
}> = ({ calendar, displayName, isDefaultTarget }) => (
  <button
    aria-label={
      isDefaultTarget
        ? `${displayName} is where new events go. Select again to undo.`
        : `Make ${displayName} where new events go`
    }
    aria-pressed={isDefaultTarget}
    className={`c-focus-ring shrink-0 rounded px-1 py-0.5 text-xs hover:bg-surface-panel ${
      isDefaultTarget
        ? "text-accent"
        : // Kept discoverable without cluttering every row: revealed on hover
          // or keyboard focus, and always present for assistive tech.
          "text-text-muted opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
    }`}
    onClick={() => setDefaultCalendarId(isDefaultTarget ? null : calendar.id)}
    type="button"
  >
    <StarIcon aria-hidden weight={isDefaultTarget ? "fill" : "regular"} />
  </button>
);
