import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminGetBookingPageResponse,
  type AdminPutBookingPageInput,
  type BookingDurationMinutes,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId, TimeZoneSchema } from "@core/types/domain-primitives";
import { type HostBookingPageResponse } from "@web/api/booking.api";
import {
  selectGoogleConnectionState,
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useAppAccess } from "@web/billing/useAppAccess";
import { BookingConnectGooglePrompt } from "@web/booking/BookingConnectGooglePrompt";
import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
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
  isUnconfiguredBookingPage,
  resolveWritableCalendars,
  toBookingPageInput,
} from "@web/booking/booking.util";
import {
  BOOKING_FIELD_BY_KEY,
  BOOKING_SEQUENCE_FIELDS,
  bookingFieldAttrs,
  bookingJumpKeys,
  focusBookingField,
} from "@web/booking/booking-sequence.fields";
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
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { settingsShortcutAttrs } from "@web/settings/useSettingsShortcuts";
import { EditSequenceMenu } from "@web/shortcuts/edit-sequence/EditSequenceMenu";
import { useEditSequenceShortcut } from "@web/shortcuts/useEditSequenceShortcut";
import { useEffectiveTimeZone } from "@web/timezone/effective-timezone.store";

const DURATION_OPTIONS: BookingDurationMinutes[] = [15, 30, 45, 60];

const isSavedBookingPage = (
  page: AdminPutBookingPageInput | AdminGetBookingPageResponse,
): page is AdminGetBookingPageResponse => "bookingUrl" in page;

const buildInitialForm = (
  page: HostBookingPageResponse | undefined,
  effectiveTimeZone: string,
  writableCalendars: Calendar[],
): AdminPutBookingPageInput => {
  const base = page ?? {
    enabled: false,
    durationMinutes: 30 as BookingDurationMinutes,
    destinationCalendarId: BOOKING_PLACEHOLDER_CALENDAR_ID,
    blockingCalendarIds: [BOOKING_PLACEHOLDER_CALENDAR_ID],
    timeZone: TimeZoneSchema.parse(effectiveTimeZone),
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

  // The server has no user timezone, so an unconfigured page carries a "UTC"
  // placeholder. Seed the browser's zone there, but leave a configured page's
  // stored zone alone - a host who deliberately picked UTC must keep it.
  const timeZone =
    page && !isUnconfiguredBookingPage(page)
      ? base.timeZone
      : effectiveTimeZone;

  // toBookingPageInput, not a spread: `base` may be the saved-page response,
  // whose response-only keys would make the strict PUT schema throw on save.
  return {
    ...toBookingPageInput(base),
    destinationCalendarId,
    blockingCalendarIds,
    timeZone: TimeZoneSchema.parse(timeZone || effectiveTimeZone),
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
  const [areHoursValid, setAreHoursValid] = useState(true);
  const sectionRef = useRef<HTMLFieldSetElement>(null);

  // ignoreAppLock because the Settings modal itself holds the lock, the same
  // reason useSettingsShortcuts sets it. Scoped to "booking" so the which-key
  // menu cannot appear over the grid, and so the grid's still-mounted listener
  // cannot disarm this sequence on the follow key.
  //
  // Stand down when focus is in a nested dialog (the timezone OverlayPanel):
  // that panel also holds app-lock, and ignoreAppLock would otherwise arm
  // Mod+E inside it and jump to a field behind the dialog.
  useEditSequenceShortcut({
    canArm: () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return true;
      const closestDialog = active.closest("[role='dialog']");
      const settingsDialog = sectionRef.current?.closest("[role='dialog']");
      return closestDialog == null || closestDialog === settingsDialog;
    },
    fieldByKey: BOOKING_FIELD_BY_KEY,
    ignoreAppLock: true,
    onSequence: focusBookingField,
    scope: "booking",
  });

  // Re-seed only when the server actually answers with a different page.
  // Keying the effect on writableCalendars/effectiveTimeZone as well meant a
  // calendars refetch or a timezone-store change wiped edits mid-typing.
  const seededPageRef = useRef<HostBookingPageResponse | undefined>(undefined);
  useEffect(() => {
    if (!serverPage || seededPageRef.current === serverPage) return;
    seededPageRef.current = serverPage;
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
    if (!areHoursValid) {
      setEnableError("Fix the weekly hours that could not be read.");
      return;
    }
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
      ref={sectionRef}
    >
      {savedPage ? (
        <div {...bookingFieldAttrs("link")}>
          <BookingCopyLink bookingUrl={savedPage.bookingUrl} />
        </div>
      ) : null}

      <label
        className="flex items-center gap-2 text-sm text-text"
        {...bookingFieldAttrs("enabled")}
      >
        <input
          checked={form.enabled}
          className="c-all-day-checkbox"
          onChange={(event) => handleEnableChange(event.target.checked)}
          type="checkbox"
        />
        Enable booking page
        {showShortcuts ? (
          <ShortcutKeys keys={bookingJumpKeys("enabled")} />
        ) : null}
      </label>
      {enableError ? (
        <p className="text-error text-sm" role="alert">
          {enableError}
        </p>
      ) : null}

      <div>
        <BookingFieldLabel
          field="duration"
          htmlFor="booking-duration"
          showShortcuts={showShortcuts}
        >
          Duration
        </BookingFieldLabel>
        <select
          {...bookingFieldAttrs("duration")}
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
        <BookingFieldLabel
          field="destination"
          htmlFor="booking-destination-calendar"
          showShortcuts={showShortcuts}
        >
          Destination calendar
        </BookingFieldLabel>
        <select
          {...bookingFieldAttrs("destination")}
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

      <fieldset
        className="flex flex-col gap-2"
        {...bookingFieldAttrs("blocking")}
      >
        <legend className="mb-1 flex items-center gap-1 text-sm text-text">
          Blocking calendars
          {showShortcuts ? (
            <ShortcutKeys keys={bookingJumpKeys("blocking")} />
          ) : null}
        </legend>
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

      <div {...bookingFieldAttrs("timezone")}>
        <BookingTimezoneField
          onChange={(timeZone) => updateForm({ timeZone })}
          shortcutKeys={showShortcuts ? bookingJumpKeys("timezone") : undefined}
          timeZone={form.timeZone}
        />
      </div>

      <div {...bookingFieldAttrs("hours")}>
        <BookingWeeklyHoursEditor
          onChange={(weeklyAvailability) => updateForm({ weeklyAvailability })}
          onValidityChange={setAreHoursValid}
          shortcutKeys={showShortcuts ? bookingJumpKeys("hours") : undefined}
          value={form.weeklyAvailability}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <BookingFieldLabel
            field="notice"
            htmlFor="booking-min-notice"
            showShortcuts={showShortcuts}
          >
            Minimum notice (hours)
          </BookingFieldLabel>
          <input
            {...bookingFieldAttrs("notice")}
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
          <BookingFieldLabel
            field="horizon"
            htmlFor="booking-max-horizon"
            showShortcuts={showShortcuts}
          >
            Maximum horizon (days)
          </BookingFieldLabel>
          <input
            {...bookingFieldAttrs("horizon")}
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

      <fieldset
        className="flex flex-col gap-2"
        {...bookingFieldAttrs("options")}
      >
        <legend className="mb-1 flex items-center gap-1 text-sm text-text">
          Buffer and limits
          {showShortcuts ? (
            <ShortcutKeys keys={bookingJumpKeys("options")} />
          ) : null}
        </legend>

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
      </fieldset>

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

      <p className="text-text-muted text-xs">
        Press <kbd>e</kbd> then a letter to jump to a field. <kbd>S</kbd> saves.
      </p>

      <EditSequenceMenu
        getAnchor={() => sectionRef.current}
        options={BOOKING_SEQUENCE_FIELDS}
        prompt="Jump to which field?"
        scope="booking"
      />
    </fieldset>
  );
}
