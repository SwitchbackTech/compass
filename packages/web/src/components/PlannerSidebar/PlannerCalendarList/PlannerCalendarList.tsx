import { type FC } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import { useSession } from "@web/auth/compass/session/useSession";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useCalendarVisibility } from "@web/calendars/useCalendarVisibility";

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

// Identity is never conveyed by color alone: primary/read-only context is
// spelled out as text next to the calendar name.
function calendarContextLabel(calendar: Calendar): string | null {
  const labels = [
    calendar.isPrimary ? "primary" : null,
    calendar.capabilities.canWrite ? null : "read-only",
  ].filter((label): label is string => label !== null);
  return labels.length > 0 ? labels.join(", ") : null;
}

interface Props {
  /** Test seam only: production callers rely on useCalendarVisibility's default. */
  coalesceDelayMs?: number;
}

export const PlannerCalendarList: FC<Props> = ({ coalesceDelayMs }) => {
  const { authenticated } = useSession();
  const { data, isPending, isError, refetch } = useCalendarsQuery();
  const { toggleCalendarVisibility, failureAnnouncement } =
    useCalendarVisibility(coalesceDelayMs);

  const calendars = sortCalendars(
    (data ?? []).filter((calendar) => calendar.isActive),
  );

  return (
    <section aria-label="Calendars">
      <h2 className="mb-2 min-w-0 truncate font-semibold text-sm text-text-lighter leading-none">
        Calendars
      </h2>

      {isPending ? (
        <p className="text-text-light-inactive text-xs">Loading calendars…</p>
      ) : isError ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="text-status-error">Couldn't load calendars.</p>
          <button
            className="c-focus-ring rounded-xs px-1.5 py-0.5 text-accent-primary hover:brightness-110"
            onClick={() => void refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : calendars.length === 0 ? (
        <p className="text-text-light-inactive text-xs">No calendars yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {calendars.map((calendar) => {
            const contextLabel = calendarContextLabel(calendar);

            return (
              <li className="flex items-center gap-2" key={calendar.id}>
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: calendar.backgroundColor }}
                />

                <span className="min-w-0 flex-1 truncate text-text-lighter text-xs">
                  {calendar.name}
                  {contextLabel ? (
                    <span className="text-text-light-inactive">
                      {" "}
                      · {contextLabel}
                    </span>
                  ) : null}
                </span>

                {authenticated ? (
                  <button
                    aria-checked={calendar.isVisible}
                    aria-label={`Show ${calendar.name} calendar`}
                    className="c-focus-ring relative h-4 w-7 shrink-0 rounded-full bg-panel-badge-bg transition-colors data-[checked=true]:bg-accent-primary"
                    data-checked={calendar.isVisible}
                    onClick={() =>
                      toggleCalendarVisibility(calendar.id, !calendar.isVisible)
                    }
                    role="switch"
                    type="button"
                  >
                    <span
                      aria-hidden
                      className="absolute top-0.5 left-0.5 size-3 rounded-full bg-text-lighter transition-transform data-[checked=true]:translate-x-3"
                      data-checked={calendar.isVisible}
                    />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <span aria-live="polite" className="sr-only" role="status">
        {failureAnnouncement}
      </span>
    </section>
  );
};
