import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AdminGetBookingPageResponse,
  type AdminGetBookingPageResult,
  type AdminPutBookingPageInput,
  type BookingDurationMinutes,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId, TimeZoneSchema } from "@core/types/domain-primitives";
import {
  selectGoogleConnectionState,
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useAppAccess } from "@web/billing/useAppAccess";
import { BookingCheckboxRow } from "@web/booking/BookingCheckboxRow";
import { BookingConnectGooglePrompt } from "@web/booking/BookingConnectGooglePrompt";
import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
import { BookingNumberField } from "@web/booking/BookingNumberField";
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
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
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

// OverlayPanel is the scrollport and uses p-8. sticky bottom-0 would pin to
// that padding box and leave a 32px unpainted strip; -bottom-8 + pb-8 drop
// the painted bar into the padding without shrinking the scroll range.
const BOOKING_SETTINGS_SAVE_BAR_CLASS_NAME =
  "sticky -bottom-8 z-10 border-border border-t bg-surface-panel pt-3 pb-8";

// Named so the value the checkbox writes and the value its label promises can
// only ever be the same number.
const DEFAULT_BUFFER_MINUTES = 30;
const DEFAULT_MAX_BOOKINGS_PER_DAY = 4;

const isSavedBookingPage = (
  page: AdminPutBookingPageInput | AdminGetBookingPageResponse,
): page is AdminGetBookingPageResponse => "bookingUrl" in page;

// Clearing a number input yields "", and Number("") is 0 - which the strict
// PUT schema rejects after the save click with no field pointer. Hold the raw
// text and only write parsed values into the form, so an empty field becomes
// an inline error instead of a dead Save button mystery.
const parseBookingCount = (
  raw: string,
  { min, max }: { min: number; max: number },
): number | null => {
  if (raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return null;
  }
  return value;
};

// Bounds mirror AdminPutBookingPageInputSchema (nonnegative notice; 1-60 day
// horizon). Notice has no schema max, so any nonnegative integer parses.
const MIN_NOTICE_BOUNDS = { min: 0, max: Number.MAX_SAFE_INTEGER };
const HORIZON_BOUNDS = { min: 1, max: 60 };

const buildInitialForm = (
  page: AdminGetBookingPageResult | undefined,
  effectiveTimeZone: string,
  writableCalendars: Calendar[],
  availabilityCalendars: Calendar[],
): AdminPutBookingPageInput => {
  const base = page ?? {
    enabled: false,
    durationMinutes: 30 as BookingDurationMinutes,
    destinationCalendarId: BOOKING_PLACEHOLDER_CALENDAR_ID,
    blockingCalendarIds: [BOOKING_PLACEHOLDER_CALENDAR_ID],
    timeZone: TimeZoneSchema.parse(effectiveTimeZone),
    weeklyAvailability: [],
    welcomeText: null,
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
          availabilityCalendars,
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
    buildInitialForm(
      undefined,
      effectiveTimeZone,
      writableCalendars,
      availabilityCalendars,
    ),
  );
  const [enableError, setEnableError] = useState<string | null>(null);
  const [areHoursValid, setAreHoursValid] = useState(true);
  const [minNoticeText, setMinNoticeText] = useState(() =>
    String(form.minNoticeHours),
  );
  const [horizonText, setHorizonText] = useState(() =>
    String(form.maxHorizonDays),
  );
  const sectionRef = useRef<HTMLFieldSetElement>(null);

  const minNoticeInvalid =
    parseBookingCount(minNoticeText, MIN_NOTICE_BOUNDS) === null;
  const horizonInvalid =
    parseBookingCount(horizonText, HORIZON_BOUNDS) === null;

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
  const seededPageRef = useRef<AdminGetBookingPageResult | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!serverPage || seededPageRef.current === serverPage) return;
    seededPageRef.current = serverPage;
    const seeded = buildInitialForm(
      serverPage,
      effectiveTimeZone,
      writableCalendars,
      availabilityCalendars,
    );
    setForm(seeded);
    setMinNoticeText(String(seeded.minNoticeHours));
    setHorizonText(String(seeded.maxHorizonDays));
  }, [availabilityCalendars, effectiveTimeZone, serverPage, writableCalendars]);

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
  const { groups: writableGroups, ungrouped: writableUngrouped } =
    groupCalendarsByAccount(writableCalendars, connections);
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

  const renderBlockingCalendar = (calendar: Calendar) => (
    <BookingCheckboxRow
      checked={blockingSet.has(calendar.id)}
      key={calendar.id}
      onChange={(checked) => toggleBlockingCalendar(calendar.id, checked)}
    >
      {calendar.name}
    </BookingCheckboxRow>
  );

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
    if ((form.welcomeText?.length ?? 0) > 500) {
      setEnableError("Welcome text must be 500 characters or fewer.");
      return;
    }
    if (minNoticeInvalid || horizonInvalid) {
      setEnableError("Fix the highlighted number fields before saving.");
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
    // Auto-copy lives here, not in the mutation: the mutation owns the query
    // cache, and putting clipboard UX there would also bury the no-link case.
    saveMutation.mutate(form, {
      onSuccess: (page) => {
        if (!("bookingUrl" in page)) {
          // No slug is allocated until the page is enabled, so there is no
          // link to copy yet - say so rather than claiming one was copied.
          showStatusToast(
            "booking-link-copied",
            "Saved. Enable booking to get your link.",
          );
          return;
        }
        void copyText(page.bookingUrl).then((didCopy) => {
          showStatusToast(
            "booking-link-copied",
            didCopy
              ? "Saved. Booking link copied."
              : "Saved. Press e then l to copy your link.",
          );
        });
      },
    });
  };

  return (
    <fieldset
      className="flex flex-col gap-4"
      disabled={isReadOnly || saveMutation.isPending}
      ref={sectionRef}
    >
      <p className="flex flex-wrap items-center gap-x-1 text-text-muted text-xs">
        Press <kbd>e</kbd> then a letter to jump to a field.
        <ShortcutKeys keys={["Mod", "Enter"]} /> saves.
      </p>

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
            <>
              {writableGroups
                .filter((group) => group.calendars.length > 0)
                .map((group) => (
                  <optgroup key={group.accountEmail} label={group.accountEmail}>
                    {group.calendars.map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              {writableUngrouped.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </>
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
                  {group.calendars.map(renderBlockingCalendar)}
                </div>
              ))}
            {ungrouped.map(renderBlockingCalendar)}
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

      <div className="flex flex-col gap-4" {...bookingFieldAttrs("hours")}>
        <BookingWeeklyHoursEditor
          onChange={(weeklyAvailability) => updateForm({ weeklyAvailability })}
          onValidityChange={setAreHoursValid}
          shortcutKeys={showShortcuts ? bookingJumpKeys("hours") : undefined}
          value={form.weeklyAvailability}
        />
      </div>

      <div>
        <BookingFieldLabel
          field="welcome"
          htmlFor="booking-welcome"
          showShortcuts={showShortcuts}
        >
          Welcome text
        </BookingFieldLabel>
        <textarea
          {...bookingFieldAttrs("welcome")}
          aria-invalid={
            (form.welcomeText?.length ?? 0) > 500 ? true : undefined
          }
          className="c-focus-ring min-h-20 w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text aria-invalid:border-error"
          id="booking-welcome"
          maxLength={500}
          onChange={(event) =>
            updateForm({
              welcomeText:
                event.target.value.trim() === "" ? null : event.target.value,
            })
          }
          value={form.welcomeText ?? ""}
        />
        {(form.welcomeText?.length ?? 0) > 500 ? (
          <p className="text-error text-xs" role="alert">
            Welcome text must be 500 characters or fewer.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BookingNumberField
          field="notice"
          id="booking-min-notice"
          invalid={minNoticeInvalid}
          invalidMessage="Enter 0 or more hours."
          label="Minimum notice (hours)"
          min={0}
          onChange={(raw) => {
            setMinNoticeText(raw);
            const parsed = parseBookingCount(raw, MIN_NOTICE_BOUNDS);
            if (parsed !== null) {
              updateForm({ minNoticeHours: parsed });
            }
          }}
          showShortcuts={showShortcuts}
          value={minNoticeText}
        />
        <BookingNumberField
          field="horizon"
          id="booking-max-horizon"
          invalid={horizonInvalid}
          invalidMessage="Enter 1 to 60 days."
          label="Maximum horizon (days)"
          max={60}
          min={1}
          onChange={(raw) => {
            setHorizonText(raw);
            const parsed = parseBookingCount(raw, HORIZON_BOUNDS);
            if (parsed !== null) {
              updateForm({ maxHorizonDays: parsed });
            }
          }}
          showShortcuts={showShortcuts}
          value={horizonText}
        />
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

        <BookingCheckboxRow
          checked={form.bufferMinutes !== null}
          onChange={(checked) =>
            updateForm({
              bufferMinutes: checked ? DEFAULT_BUFFER_MINUTES : null,
            })
          }
        >
          Buffer between appointments ({DEFAULT_BUFFER_MINUTES} minutes)
        </BookingCheckboxRow>

        <BookingCheckboxRow
          checked={form.maxBookingsPerDay !== null}
          onChange={(checked) =>
            updateForm({
              maxBookingsPerDay: checked ? DEFAULT_MAX_BOOKINGS_PER_DAY : null,
            })
          }
        >
          Max bookings per day ({DEFAULT_MAX_BOOKINGS_PER_DAY})
        </BookingCheckboxRow>

        <BookingCheckboxRow
          checked={form.guestsCanInviteOthers}
          onChange={(guestsCanInviteOthers) =>
            updateForm({ guestsCanInviteOthers })
          }
        >
          Guest can invite others
        </BookingCheckboxRow>
      </fieldset>

      <div className={BOOKING_SETTINGS_SAVE_BAR_CLASS_NAME}>
        <OverlayPanelActions align="end">
          <OverlayPanelActionButton
            aria-busy={saveMutation.isPending || undefined}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="whitespace-nowrap"
            disabled={saveMutation.isPending}
            onClick={handleSave}
            shortcut={["Mod", "Enter"]}
            showShortcut
            variant="primary"
            {...settingsShortcutAttrs("save-booking")}
          >
            {saveMutation.isPending ? "Saving…" : "Save booking settings"}
          </OverlayPanelActionButton>
        </OverlayPanelActions>
      </div>

      <EditSequenceMenu
        getAnchor={() => sectionRef.current}
        options={BOOKING_SEQUENCE_FIELDS}
        prompt="Jump to which field?"
        scope="booking"
      />
    </fieldset>
  );
}
