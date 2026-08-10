import { type FC, useMemo } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { shouldShowContextualLoadError } from "@web/api/util/api.util";
import { useSession } from "@web/auth/compass/session/useSession";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import {
  compareCalendars,
  groupCalendarsByAccount,
} from "@web/calendars/calendar.util";
import {
  accountCalendarListId,
  useCollapsedAccountKeys,
} from "@web/calendars/collapsed-accounts.store";
import { useCalendarVisibility } from "@web/calendars/useCalendarVisibility";
import { useConnectedAccountEmails } from "@web/calendars/useDefaultTargetCalendar";
import { AccountSectionHeader } from "./AccountSectionHeader";
import { AnonymousCalendarRow } from "./AnonymousCalendarRow";
import { CalendarListHeader } from "./CalendarListHeader";

export const CalendarList: FC = () => {
  const { authenticated } = useSession();
  const { email } = useUser();
  const { isAvailable, state } = useConnectGoogle();
  const { data, error, isPending, isError, refetch } = useCalendarsQuery();
  const { toggleCalendarVisibility, failureAnnouncement } =
    useCalendarVisibility();
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const accountEmailOrder = useConnectedAccountEmails();
  const collapsedKeys = useCollapsedAccountKeys();

  const hasConnectedAccount = accountEmailOrder.length > 0;
  const isAnonymous = !email;
  // Session expiry already surfaces SessionExpiredToast — don't also show
  // "Couldn't load calendars" / Retry (or a false empty-list story) for it.
  const showCalendarsLoadError = shouldShowContextualLoadError(isError, error);
  const hideCalendarsBody = isPending || (isError && !showCalendarsLoadError);

  // Re-groups on every calendar-visibility/collapse toggle otherwise, since
  // those live in sibling external stores this component also subscribes to.
  const calendars = useMemo(
    () =>
      (data ?? [])
        .filter(
          (calendar) =>
            calendar.isActive &&
            // Once any account is connected, the local calendar can no
            // longer gain new events (LCV1/LCV2 close off both the ways it
            // could) and no longer explains itself to the user the way an
            // account-owned calendar does - drop its orphan row rather than
            // show it. Gated on connection state, not on the calendar being
            // empty: nothing can write to it anymore, and prod carries zero
            // connected users with events already on it (see
            // local-calendar-visibility LCV3).
            (!hasConnectedAccount || calendar.provider !== "local"),
        )
        .sort(compareCalendars(accountEmailOrder)),
    [data, accountEmailOrder, hasConnectedAccount],
  );
  const { groups, ungrouped } = useMemo(
    () => groupCalendarsByAccount(calendars, connections),
    [calendars, connections],
  );

  const renderRows = (rows: Calendar[], id?: string) => (
    <ul className="flex flex-col gap-1.5" id={id}>
      {rows.map((calendar) => (
        <CalendarRow
          calendar={calendar}
          key={calendar.id}
          onToggle={toggleCalendarVisibility}
        />
      ))}
    </ul>
  );

  // Renders nothing (rather than an aria-hidden wrapper) when collapsed: the
  // toggle in the account's own heading still announces aria-expanded, and
  // this way a hidden section's rows are never briefly stale mid-toggle.
  const renderCollapsible = (key: string, rows: Calendar[]) =>
    collapsedKeys.has(key)
      ? null
      : renderRows(rows, accountCalendarListId(key));

  return (
    <section aria-label="Calendars">
      {/* Every connected account carries its own heading below, so the generic
          banner is only for users who have none yet and are signed in. Anonymous
          users get a single calendar row instead. Showing it alongside account
          sections would duplicate one section's status under a second, unlabeled
          heading with no way to tell them apart. */}
      {groups.length === 0 && !isAnonymous && <CalendarListHeader />}

      {hideCalendarsBody ? null : showCalendarsLoadError ? (
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
      ) : (
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
              {renderCollapsible(group.accountEmail, group.calendars)}
            </section>
          ))}
          {ungrouped.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {ungrouped.map((calendar) =>
                isAnonymous ? (
                  <AnonymousCalendarRow calendar={calendar} key={calendar.id} />
                ) : (
                  <CalendarRow
                    calendar={calendar}
                    key={calendar.id}
                    label={
                      calendar.provider === "local" ? calendar.name : undefined
                    }
                    onToggle={toggleCalendarVisibility}
                  />
                ),
              )}
            </ul>
          ) : null}
        </div>
      )}

      <span aria-live="polite" className="sr-only" role="status">
        {failureAnnouncement}
      </span>
    </section>
  );
};

const CalendarRow: FC<{
  calendar: Calendar;
  label?: string;
  onToggle: (calendarId: Calendar["id"], isVisible: boolean) => void;
}> = ({ calendar, label, onToggle }) => {
  // If an explicit label is provided, use it (for ungrouped rows that have no
  // account heading). Otherwise, a primary calendar's row reads "primary"
  // instead of repeating the account name already in the section heading.
  const displayName = label ?? (calendar.isPrimary ? "primary" : calendar.name);

  return (
    <li className="flex min-w-0 items-center gap-1">
      <button
        aria-label={`${calendar.isVisible ? "Hide" : "Show"} ${displayName} calendar`}
        aria-pressed={calendar.isVisible}
        className="c-focus-ring flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-text-muted text-xs hover:bg-surface-panel hover:text-text"
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
    </li>
  );
};
