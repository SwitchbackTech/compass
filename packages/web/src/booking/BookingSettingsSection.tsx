import { useEffect, useMemo, useState } from "react";
import {
  type AdminGetBookingPageResponse,
  type AdminPutBookingPageInput,
  type BookingDurationMinutes,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import {
  type CalendarId,
  type TimeZone,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import {
  selectGoogleConnectionState,
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useAppAccess } from "@web/billing/useAppAccess";
import { BookingConnectGooglePrompt } from "@web/booking/BookingConnectGooglePrompt";
import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { BookingTimezoneField } from "@web/booking/BookingTimezoneField";
import { BookingWeeklyHoursEditor } from "@web/booking/BookingWeeklyHoursEditor";
import {
  useBookingPageQuery,
  useSaveBookingPageMutation,
} from "@web/booking/booking.query";
import {
  BOOKING_PLACEHOLDER_CALENDAR_ID,
  canEnableBookingPage,
  defaultBlockingCalendarIdsForDestination,
  getAvailabilityReadableCalendars,
  isPlaceholderDestinationCalendar,
  resolveWritableCalendars,
} from "@web/booking/booking.util";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import {
  compareCalendars,
  groupCalendarsByAccount,
} from "@web/calendars/calendar.util";
import { useConnectedAccountEmails } from "@web/calendars/useDefaultTargetCalendar";
import {
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { settingsShortcutAttrs } from "@web/settings/useSettingsShortcuts";
import { useEffectiveTimeZone } from "@web/timezone/effective-timezone.store";

const DURATION_OPTIONS: BookingDurationMinutes[] = [15, 30, 45, 60];

const isSavedBookingPage = (
  page: AdminPutBookingPageInput | AdminGetBookingPageResponse,
): page is AdminGetBookingPageResponse => "bookingUrl" in page;

const buildInitialForm = (
  page: AdminPutBookingPageInput | undefined,
  effectiveTimeZone: string,
  writableCalendars: Calendar[],
): AdminPutBookingPageInput => {
  const base = page ?? {
    enabled: false,
    durationMinutes: 30 as BookingDurationMinutes,
    destinationCalendarId: BOOKING_PLACEHOLDER_CALENDAR_ID,
    blockingCalendarIds: [BOOKING_PLACEHOLDER_CALENDAR_ID],
    timeZone: effectiveTimeZone,
    weeklyAvailability: [],
    minNoticeHours: 4,
    maxHorizonDays: 60,
    bufferMinutes: null,
    maxBookingsPerDay: null,
    guestsCanInviteOthers: true,
  };

  const destinationCalendarId =
    !isPlaceholderDestinationCalendar(base.destinationCalendarId) &&
    writableCalendars.some(
      (calendar) => calendar.id === base.destinationCalendarId,
    )
      ? base.destinationCalendarId
      : (writableCalendars[0]?.id ?? BOOKING_PLACEHOLDER_CALENDAR_ID);

  const blockingCalendarIds =
    base.blockingCalendarIds.length > 0 &&
    !base.blockingCalendarIds.every(isPlaceholderDestinationCalendar)
      ? base.blockingCalendarIds
      : defaultBlockingCalendarIdsForDestination(
          destinationCalendarId,
          writableCalendars,
        );

  return {
    ...base,
    destinationCalendarId,
    blockingCalendarIds,
    timeZone: TimeZoneSchema.parse(base.timeZone || effectiveTimeZone),
  };
};

interface BookingSettingsSectionProps {
  showShortcuts: boolean;
}

export function BookingSettingsSection({
  showShortcuts,
}: BookingSettingsSectionProps) {
  const googleConnectionState = useUserMetadataStore(
    selectGoogleConnectionState,
  );
  const connections = useUserMetadataStore(selectGoogleSyncConnections);
  const isGoogleHealthy = googleConnectionState === "HEALTHY";
  const access = useAppAccess();
  const isReadOnly = access.kind === "server" && access.isReadOnly;
  const effectiveTimeZone = useEffectiveTimeZone();
  const { data: calendars = [] } = useCalendarsQuery();
  const accountEmailOrder = useConnectedAccountEmails();
  const writableCalendars = useMemo(
    () =>
      resolveWritableCalendars(calendars, accountEmailOrder.length > 0).sort(
        compareCalendars(accountEmailOrder),
      ),
    [accountEmailOrder, calendars],
  );
  const availabilityCalendars = useMemo(
    () =>
      getAvailabilityReadableCalendars(calendars).sort(
        compareCalendars(accountEmailOrder),
      ),
    [accountEmailOrder, calendars],
  );
  const { data: serverPage, isPending } = useBookingPageQuery(isGoogleHealthy);
  const saveMutation = useSaveBookingPageMutation();
  const [form, setForm] = useState<AdminPutBookingPageInput>(() =>
    buildInitialForm(undefined, effectiveTimeZone, writableCalendars),
  );
  const [enableError, setEnableError] = useState<string | null>(null);

  useEffect(() => {
    if (!serverPage) return;
    setForm(buildInitialForm(serverPage, effectiveTimeZone, writableCalendars));
  }, [effectiveTimeZone, serverPage, writableCalendars]);

  if (!isGoogleHealthy) {
    return <BookingConnectGooglePrompt />;
  }

  if (isPending) {
    return <p className="text-sm text-text-muted">Loading booking settings…</p>;
  }

  const savedPage =
    serverPage && isSavedBookingPage(serverPage) ? serverPage : null;
  const blockingSet = new Set(form.blockingCalendarIds);
  const { groups, ungrouped } = groupCalendarsByAccount(
    availabilityCalendars,
    connections,
  );

  const updateForm = (patch: Partial<AdminPutBookingPageInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    setEnableError(null);
  };

  const handleDestinationChange = (destinationCalendarId: CalendarId) => {
    setForm((current) => ({
      ...current,
      destinationCalendarId,
      blockingCalendarIds: defaultBlockingCalendarIdsForDestination(
        destinationCalendarId,
        availabilityCalendars,
      ),
    }));
    setEnableError(null);
  };

  const toggleBlockingCalendar = (calendarId: CalendarId, checked: boolean) => {
    setForm((current) => {
      const next = new Set(current.blockingCalendarIds);
      if (checked) next.add(calendarId);
      else next.delete(calendarId);
      return {
        ...current,
        blockingCalendarIds: [...next],
      };
    });
  };

  const handleEnableChange = (enabled: boolean) => {
    if (enabled && !canEnableBookingPage(form, writableCalendars)) {
      setEnableError("Choose a destination calendar before enabling booking.");
      return;
    }
    updateForm({ enabled });
  };

  const handleSave = () => {
    if (form.enabled && !canEnableBookingPage(form, writableCalendars)) {
      setEnableError("Choose a destination calendar before enabling booking.");
      return;
    }
    if (form.enabled && form.blockingCalendarIds.length === 0) {
      setEnableError("Select at least one blocking calendar.");
      return;
    }
    setEnableError(null);
    saveMutation.mutate(form);
  };

  return (
    <fieldset
      className="flex flex-col gap-4"
      disabled={isReadOnly || saveMutation.isPending}
    >
      {savedPage ? <BookingCopyLink bookingUrl={savedPage.bookingUrl} /> : null}

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          checked={form.enabled}
          className="c-all-day-checkbox"
          onChange={(event) => handleEnableChange(event.target.checked)}
          type="checkbox"
        />
        Enable booking page
      </label>
      {enableError ? (
        <p className="text-error text-sm" role="alert">
          {enableError}
        </p>
      ) : null}

      <div>
        <label
          className="mb-1 block text-sm text-text"
          htmlFor="booking-duration"
        >
          Duration
        </label>
        <select
          className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
          id="booking-duration"
          onChange={(event) =>
            updateForm({
              durationMinutes: Number(
                event.target.value,
              ) as BookingDurationMinutes,
            })
          }
          value={form.durationMinutes}
        >
          {DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="mb-1 block text-sm text-text"
          htmlFor="booking-destination-calendar"
        >
          Destination calendar
        </label>
        <select
          className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
          id="booking-destination-calendar"
          onChange={(event) =>
            handleDestinationChange(event.target.value as CalendarId)
          }
          value={form.destinationCalendarId}
        >
          {writableCalendars.length === 0 ? (
            <option value={BOOKING_PLACEHOLDER_CALENDAR_ID}>
              No writable calendars
            </option>
          ) : (
            writableCalendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
                {calendar.accountEmail ? ` (${calendar.accountEmail})` : ""}
              </option>
            ))
          )}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-text">Blocking calendars</legend>
        {availabilityCalendars.length === 0 ? (
          <p className="text-sm text-text-muted">No calendars available.</p>
        ) : (
          <>
            {groups
              .filter((group) => group.calendars.length > 0)
              .map((group) => (
                <div className="flex flex-col gap-1" key={group.accountEmail}>
                  <p className="text-text-muted text-xs">
                    {group.accountEmail}
                  </p>
                  {group.calendars.map((calendar) => (
                    <label
                      className="flex items-center gap-2 text-sm text-text"
                      key={calendar.id}
                    >
                      <input
                        checked={blockingSet.has(calendar.id)}
                        className="c-all-day-checkbox"
                        onChange={(event) =>
                          toggleBlockingCalendar(
                            calendar.id,
                            event.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                      {calendar.name}
                    </label>
                  ))}
                </div>
              ))}
            {ungrouped.map((calendar) => (
              <label
                className="flex items-center gap-2 text-sm text-text"
                key={calendar.id}
              >
                <input
                  checked={blockingSet.has(calendar.id)}
                  className="c-all-day-checkbox"
                  onChange={(event) =>
                    toggleBlockingCalendar(calendar.id, event.target.checked)
                  }
                  type="checkbox"
                />
                {calendar.name}
              </label>
            ))}
          </>
        )}
      </fieldset>

      <BookingTimezoneField
        onChange={(timeZone) => updateForm({ timeZone })}
        timeZone={form.timeZone}
      />

      <BookingWeeklyHoursEditor
        onChange={(weeklyAvailability) => updateForm({ weeklyAvailability })}
        value={form.weeklyAvailability}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1 block text-sm text-text"
            htmlFor="booking-min-notice"
          >
            Minimum notice (hours)
          </label>
          <input
            className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
            id="booking-min-notice"
            min={0}
            onChange={(event) =>
              updateForm({ minNoticeHours: Number(event.target.value) })
            }
            type="number"
            value={form.minNoticeHours}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm text-text"
            htmlFor="booking-max-horizon"
          >
            Maximum horizon (days)
          </label>
          <input
            className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
            id="booking-max-horizon"
            max={60}
            min={1}
            onChange={(event) =>
              updateForm({ maxHorizonDays: Number(event.target.value) })
            }
            type="number"
            value={form.maxHorizonDays}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          checked={form.bufferMinutes !== null}
          className="c-all-day-checkbox"
          onChange={(event) =>
            updateForm({ bufferMinutes: event.target.checked ? 30 : null })
          }
          type="checkbox"
        />
        Buffer between appointments (30 minutes)
      </label>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          checked={form.maxBookingsPerDay !== null}
          className="c-all-day-checkbox"
          onChange={(event) =>
            updateForm({ maxBookingsPerDay: event.target.checked ? 4 : null })
          }
          type="checkbox"
        />
        Max bookings per day (4)
      </label>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          checked={form.guestsCanInviteOthers}
          className="c-all-day-checkbox"
          onChange={(event) =>
            updateForm({ guestsCanInviteOthers: event.target.checked })
          }
          type="checkbox"
        />
        Guest can invite others
      </label>

      <OverlayPanelActions align="start">
        <OverlayPanelActionButton
          aria-busy={saveMutation.isPending || undefined}
          disabled={saveMutation.isPending}
          onClick={handleSave}
          shortcut="S"
          showShortcut={showShortcuts}
          variant="primary"
          {...settingsShortcutAttrs("save-booking")}
        >
          {saveMutation.isPending ? "Saving…" : "Save booking settings"}
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </fieldset>
  );
}
