import {
  type MutableRefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AdminGetBookingPageResult,
  type AdminPutBookingPageInput,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_MAX_MIN_NOTICE_HOURS,
  BOOKING_PLACEHOLDER_CALENDAR_ID,
  type BookingDurationMinutes,
  buildDefaultAdminPutInput,
  isSavedBookingPage,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId, TimeZoneSchema } from "@core/types/domain-primitives";
import { track } from "@web/auth/posthog/track";
import {
  selectGoogleConnectionState,
  selectSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { useAppAccess } from "@web/billing/useAppAccess";
import {
  BookingAddressField,
  bookingAddressPrefix,
} from "@web/booking/BookingAddressField";
import { BookingBlockingCalendarsField } from "@web/booking/BookingBlockingCalendarsField";
import { BookingConnectPrompt } from "@web/booking/BookingConnectPrompt";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
import { BookingLimitsFieldset } from "@web/booking/BookingLimitsFieldset";
import { BookingMoreOptions } from "@web/booking/BookingMoreOptions";
import { BookingNumberField } from "@web/booking/BookingNumberField";
import { BookingSaveBar } from "@web/booking/BookingSaveBar";
import { BookingStatusHeader } from "@web/booking/BookingStatusHeader";
import { BookingTimezoneField } from "@web/booking/BookingTimezoneField";
import { BookingWeeklyHoursEditor } from "@web/booking/BookingWeeklyHoursEditor";
import {
  bookingSaveErrorInline,
  useBookingPageQuery,
  useSaveBookingPageMutation,
} from "@web/booking/booking.query";
import {
  defaultBlockingCalendarIdsForDestination,
  getAvailabilityReadableCalendars,
  isBookingSettingsFormDirty,
  isPlaceholderDestinationCalendar,
  isUnconfiguredBookingPage,
  isWelcomeTextTooLong,
  slugFromAdminBookingPage,
  toBookingPageInput,
  validateBookingForm,
  WELCOME_TEXT_MAX_LENGTH,
  WELCOME_TEXT_TOO_LONG_MESSAGE,
} from "@web/booking/booking.util";
import {
  bookingDestinationConferenceHint,
  formatBookingDestinationOptionLabel,
  resolveBookingConference,
} from "@web/booking/booking-conference.copy";
import {
  type BookingField,
  bookingFieldAttrs,
  bookingJumpKeys,
  focusBookingField,
} from "@web/booking/booking-sequence.fields";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import {
  compareCalendars,
  getWritableCalendars,
  groupCalendarsByAccount,
} from "@web/calendars/calendar.util";
import { getLocalCalendarSentinelId } from "@web/calendars/local-calendar.sentinel";
import { useConnectedAccountEmails } from "@web/calendars/useDefaultTargetCalendar";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { useEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { DiscardUnsavedChangesDialog } from "@web/views/Forms/EventForm/DiscardUnsavedChangesDialog";

const DURATION_OPTIONS: BookingDurationMinutes[] = [15, 30, 45, 60];

const MORE_OPTIONS_FIELDS = new Set<BookingField>([
  "blocking",
  "welcome",
  "notice",
  "horizon",
  "options",
]);

const BOOKING_SELECT_CLASS_NAME =
  "c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel";

/** Copy the public link, then report whichever of the two outcomes happened. */
const copyBookingLinkThenToast = (
  bookingUrl: string,
  copy: { onCopy: string; onFail: string },
) => {
  void copyText(bookingUrl).then((didCopy) => {
    if (didCopy) {
      track("booking_link_copied", { source: "save" });
    }
    showStatusToast("booking-link-copied", didCopy ? copy.onCopy : copy.onFail);
  });
};

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

const MIN_NOTICE_BOUNDS = { min: 0, max: BOOKING_MAX_MIN_NOTICE_HOURS };
const HORIZON_BOUNDS = { min: 1, max: BOOKING_MAX_HORIZON_DAYS };

const buildInitialForm = (
  page: AdminGetBookingPageResult | undefined,
  effectiveTimeZone: string,
  writableCalendars: Calendar[],
  availabilityCalendars: Calendar[],
): AdminPutBookingPageInput => {
  const base =
    page ?? buildDefaultAdminPutInput(TimeZoneSchema.parse(effectiveTimeZone));

  const destinationCalendarId =
    !isPlaceholderDestinationCalendar(base.destinationCalendarId) &&
    (writableCalendars.some(
      (calendar) => calendar.id === base.destinationCalendarId,
    ) ||
      writableCalendars.length === 0)
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

  const timeZone =
    page && !isUnconfiguredBookingPage(page)
      ? base.timeZone
      : effectiveTimeZone;

  const slug = page ? slugFromAdminBookingPage(page) : undefined;

  return {
    ...toBookingPageInput({
      ...base,
      ...(slug !== undefined ? { slug } : {}),
    }),
    destinationCalendarId,
    blockingCalendarIds,
    timeZone: TimeZoneSchema.parse(timeZone || effectiveTimeZone),
  };
};

interface BookingSettingsSectionProps {
  showShortcuts: boolean;
  /**
   * Settings OverlayPanel owns Escape. When this returns true, Settings must
   * not dismiss: the booking form is dirty and the discard dialog is open.
   */
  dismissGuardRef?: MutableRefObject<(() => boolean) | null>;
  /** Close Settings after the host confirms discarding unsaved booking edits. */
  onDiscardUnsaved?: () => void;
}

export function BookingSettingsSection({
  showShortcuts,
  dismissGuardRef,
  onDiscardUnsaved,
}: BookingSettingsSectionProps) {
  const googleConnectionState = useUserMetadataStore(
    selectGoogleConnectionState,
  );
  const connections = useUserMetadataStore(selectSyncConnections);
  const hasHealthyConnection =
    connections.some(
      (connection) => connection.connectionState === "HEALTHY",
    ) || googleConnectionState === "HEALTHY";
  const access = useAppAccess();
  const isReadOnly = access.kind === "server" && access.isReadOnly;
  const effectiveTimeZone = useEffectiveTimeZone();
  const {
    data: calendars = [],
    isPending: calendarsPending,
    refetch: refetchCalendars,
  } = useCalendarsQuery();
  const [hostCalendarsRefetchDone, setHostCalendarsRefetchDone] =
    useState(false);
  const accountEmailOrder = useConnectedAccountEmails();
  const writableCalendars = useMemo(
    () =>
      getWritableCalendars(calendars, {
        hasConnectedAccount: accountEmailOrder.length > 0,
      }).sort(compareCalendars(accountEmailOrder)),
    [accountEmailOrder, calendars],
  );
  const availabilityCalendars = useMemo(
    () =>
      getAvailabilityReadableCalendars(calendars).sort(
        compareCalendars(accountEmailOrder),
      ),
    [accountEmailOrder, calendars],
  );
  const waitingForHostCalendars =
    hasHealthyConnection &&
    writableCalendars.length === 0 &&
    calendars.length === 1 &&
    calendars[0]?.id === getLocalCalendarSentinelId() &&
    !hostCalendarsRefetchDone;

  useEffect(() => {
    if (!hasHealthyConnection || hostCalendarsRefetchDone) return;
    if (writableCalendars.length > 0) {
      setHostCalendarsRefetchDone(true);
      return;
    }
    if (
      calendars.length !== 1 ||
      calendars[0]?.id !== getLocalCalendarSentinelId()
    ) {
      setHostCalendarsRefetchDone(true);
      return;
    }
    void refetchCalendars().finally(() => {
      setHostCalendarsRefetchDone(true);
    });
  }, [
    calendars,
    hasHealthyConnection,
    hostCalendarsRefetchDone,
    refetchCalendars,
    writableCalendars.length,
  ]);

  const { data: serverPage, isPending } =
    useBookingPageQuery(hasHealthyConnection);
  const saveMutation = useSaveBookingPageMutation();
  const [form, setForm] = useState<AdminPutBookingPageInput>(() =>
    buildInitialForm(
      undefined,
      effectiveTimeZone,
      writableCalendars,
      availabilityCalendars,
    ),
  );
  const [saveError, setSaveError] = useState<{
    message: string;
    field?: BookingField;
  } | null>(null);
  const [areHoursValid, setAreHoursValid] = useState(true);
  const [minNoticeText, setMinNoticeText] = useState(() =>
    String(form.minNoticeHours),
  );
  const [horizonText, setHorizonText] = useState(() =>
    String(form.maxHorizonDays),
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hoursDraftDirty, setHoursDraftDirty] = useState(false);
  // The settings fieldset is disabled while a save is in flight, so focusing
  // from onError is a no-op. Wait until the mutation settles and the field
  // is enabled again.
  useLayoutEffect(() => {
    if (saveMutation.isPending || saveError?.field == null) return;
    focusBookingField(saveError.field);
  }, [saveError, saveMutation.isPending]);
  const sectionRef = useRef<HTMLFieldSetElement>(null);
  const baselineFormRef = useRef<AdminPutBookingPageInput | null>(null);

  const minNoticeInvalid =
    parseBookingCount(minNoticeText, MIN_NOTICE_BOUNDS) === null;
  const horizonInvalid =
    parseBookingCount(horizonText, HORIZON_BOUNDS) === null;

  // Re-seed only when the server actually answers with a different page.
  // Keying the effect on writableCalendars/effectiveTimeZone as well meant a
  // calendars refetch or a timezone-store change wiped edits mid-typing.
  const seededPageRef = useRef<AdminGetBookingPageResult | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!serverPage || seededPageRef.current === serverPage) return;
    // The week-view cache can still be the anonymous local calendar after
    // e2e (or a fresh login) flips authenticated. Seeding against that empty
    // writable list sticks a placeholder destination that the identity guard
    // will not correct.
    if (calendarsPending || waitingForHostCalendars) return;
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
    baselineFormRef.current = seeded;
  }, [
    availabilityCalendars,
    calendarsPending,
    effectiveTimeZone,
    serverPage,
    waitingForHostCalendars,
    writableCalendars,
  ]);

  // Not ready until the calendars settle and the effect above has consumed
  // this server page. The analytics effect and the render guard must read the
  // same value, or "settings opened" fires against a form the host cannot see.
  const isSeedingForm =
    isPending ||
    calendarsPending ||
    waitingForHostCalendars ||
    (serverPage != null && seededPageRef.current !== serverPage);

  const isDirty =
    (baselineFormRef.current !== null &&
      isBookingSettingsFormDirty({
        baseline: baselineFormRef.current,
        form,
        horizonText,
        minNoticeText,
      })) ||
    hoursDraftDirty;

  if (dismissGuardRef) {
    dismissGuardRef.current = () => {
      if (!isDirty) return false;
      setIsConfirmOpen(true);
      return true;
    };
  }

  useEffect(() => {
    return () => {
      if (dismissGuardRef) dismissGuardRef.current = null;
    };
  }, [dismissGuardRef]);

  const settingsOpenedRef = useRef(false);
  useEffect(() => {
    if (settingsOpenedRef.current) return;
    if (!hasHealthyConnection) {
      settingsOpenedRef.current = true;
      track("booking_settings_opened", {
        has_connection: false,
        is_live: false,
      });
      return;
    }
    if (isSeedingForm) return;
    settingsOpenedRef.current = true;
    track("booking_settings_opened", {
      has_connection: true,
      is_live: isSavedBookingPage(serverPage) && serverPage.enabled === true,
    });
  }, [hasHealthyConnection, isSeedingForm, serverPage]);

  if (!hasHealthyConnection) {
    return <BookingConnectPrompt />;
  }

  if (isSeedingForm) {
    return <p className="text-sm text-text-muted">Loading meeting settings…</p>;
  }

  const savedPage = isSavedBookingPage(serverPage) ? serverPage : null;
  const isLive = savedPage?.enabled === true;
  const savedSlug =
    serverPage && !isUnconfiguredBookingPage(serverPage)
      ? slugFromAdminBookingPage(serverPage)
      : null;
  const addressPrefix = bookingAddressPrefix(savedPage?.bookingUrl ?? null);
  const addressPreview = form.slug ? `${addressPrefix}${form.slug}` : null;
  const { groups: writableGroups, ungrouped: writableUngrouped } =
    groupCalendarsByAccount(writableCalendars, connections);
  const destinationCalendar = writableCalendars.find(
    (calendar) => calendar.id === form.destinationCalendarId,
  );
  const destinationConference = destinationCalendar
    ? resolveBookingConference(
        destinationCalendar.conference,
        destinationCalendar.createsGoogleMeet,
      )
    : "meet";
  const destinationCannotMintMeet = destinationConference === "none";
  const destinationConferenceHint = destinationCalendar
    ? bookingDestinationConferenceHint(destinationCalendar)
    : null;
  const destinationMeetWarningId = "booking-destination-meet-warning";
  const updateForm = (patch: Partial<AdminPutBookingPageInput>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSaveError(null);
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
    setSaveError(null);
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
    setSaveError(null);
  };

  const submit = (enabled: boolean) => {
    const error = validateBookingForm({
      areHoursValid,
      enabling: enabled,
      form,
      horizonInvalid,
      minNoticeInvalid,
      writableCalendars,
    });
    if (error) {
      setSaveError(error);
      return;
    }
    setSaveError(null);
    const wasLive = isLive;
    saveMutation.mutate(
      { ...form, enabled },
      {
        onError: (mutationError) => {
          const inline = bookingSaveErrorInline(mutationError);
          if (inline) setSaveError(inline);
        },
        onSuccess: (page) => {
          if (!enabled) {
            showStatusToast(
              "booking-link-copied",
              wasLive
                ? "Meeting page turned off."
                : "Saved. Turn on your meeting page to share the link.",
            );
            return;
          }
          if (!wasLive) {
            track("booking_page_enabled", {
              first_time: savedPage == null,
            });
          }
          if (!isSavedBookingPage(page)) return;
          copyBookingLinkThenToast(
            page.bookingUrl,
            wasLive
              ? {
                  onCopy: "Saved. Meeting link copied.",
                  onFail: "Saved. Press Mod U to copy your link.",
                }
              : {
                  onCopy: "Your meeting page is live. Link copied.",
                  onFail: "Live. Press Mod U to copy your link.",
                },
          );
        },
      },
    );
  };

  const forceOpenMoreOptions =
    isWelcomeTextTooLong(form.welcomeText) ||
    minNoticeInvalid ||
    horizonInvalid ||
    (saveError?.field != null && MORE_OPTIONS_FIELDS.has(saveError.field));

  return (
    <>
      <fieldset
        className="flex flex-col gap-2"
        disabled={isReadOnly || saveMutation.isPending}
        ref={sectionRef}
      >
        <BookingStatusHeader
          addressPreview={addressPreview}
          bookingUrl={savedPage?.bookingUrl ?? null}
          isLive={isLive}
          isPending={saveMutation.isPending}
          onToggle={(next) => submit(next)}
          showShortcuts={showShortcuts}
        />

        <BookingAddressField
          bookingUrl={savedPage?.bookingUrl ?? null}
          forceInvalid={saveError?.field === "address"}
          onChange={(nextSlug) => updateForm({ slug: nextSlug })}
          savedSlug={savedSlug}
          showShortcuts={showShortcuts}
          slug={form.slug ?? ""}
        />

        <div className="grid grid-cols-2 gap-3">
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
              className={BOOKING_SELECT_CLASS_NAME}
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

          <div {...bookingFieldAttrs("timezone")}>
            <BookingTimezoneField
              onChange={(timeZone) => updateForm({ timeZone })}
              shortcutKeys={
                showShortcuts ? bookingJumpKeys("timezone") : undefined
              }
              timeZone={form.timeZone}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1" {...bookingFieldAttrs("hours")}>
          <BookingWeeklyHoursEditor
            onChange={(weeklyAvailability) =>
              updateForm({ weeklyAvailability })
            }
            onDraftDirtyChange={setHoursDraftDirty}
            onValidityChange={setAreHoursValid}
            shortcutKeys={showShortcuts ? bookingJumpKeys("hours") : undefined}
            value={form.weeklyAvailability}
          />
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
            aria-describedby={
              destinationCannotMintMeet ? destinationMeetWarningId : undefined
            }
            className={BOOKING_SELECT_CLASS_NAME}
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
                    <optgroup
                      key={group.accountEmail}
                      label={group.accountEmail}
                    >
                      {group.calendars.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>
                          {formatBookingDestinationOptionLabel(calendar)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                {writableUngrouped.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {formatBookingDestinationOptionLabel(calendar)}
                  </option>
                ))}
              </>
            )}
          </select>
          {destinationConferenceHint ? (
            <p
              className="mt-1 text-sm text-warning"
              id={destinationMeetWarningId}
              role="status"
            >
              {destinationConferenceHint}
            </p>
          ) : null}
        </div>

        <BookingMoreOptions
          forceOpen={forceOpenMoreOptions}
          showShortcuts={showShortcuts}
        >
          <BookingBlockingCalendarsField
            availabilityCalendars={availabilityCalendars}
            blockingCalendarIds={form.blockingCalendarIds}
            connections={connections}
            onToggle={toggleBlockingCalendar}
            showShortcuts={showShortcuts}
          />

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
                isWelcomeTextTooLong(form.welcomeText) ? true : undefined
              }
              className="c-focus-ring min-h-20 w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text aria-invalid:border-error"
              id="booking-welcome"
              maxLength={WELCOME_TEXT_MAX_LENGTH}
              onChange={(event) =>
                updateForm({
                  welcomeText:
                    event.target.value.trim() === ""
                      ? null
                      : event.target.value,
                })
              }
              value={form.welcomeText ?? ""}
            />
            {isWelcomeTextTooLong(form.welcomeText) ? (
              <p className="text-error text-xs" role="alert">
                {WELCOME_TEXT_TOO_LONG_MESSAGE}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BookingNumberField
              field="notice"
              id="booking-min-notice"
              invalid={minNoticeInvalid}
              invalidMessage={`Enter 0 to ${BOOKING_MAX_MIN_NOTICE_HOURS} hours.`}
              label="Minimum notice (hours)"
              max={BOOKING_MAX_MIN_NOTICE_HOURS}
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
              invalidMessage={`Enter 1 to ${BOOKING_MAX_HORIZON_DAYS} days.`}
              label="Maximum horizon (days)"
              max={BOOKING_MAX_HORIZON_DAYS}
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

          <BookingLimitsFieldset
            bufferMinutes={form.bufferMinutes}
            guestsCanInviteOthers={form.guestsCanInviteOthers}
            maxBookingsPerDay={form.maxBookingsPerDay}
            onChange={updateForm}
            showShortcuts={showShortcuts}
          />
        </BookingMoreOptions>

        <BookingSaveBar
          error={saveError?.message ?? null}
          isPending={saveMutation.isPending}
          onSubmit={() => submit(savedPage?.enabled ?? false)}
        />
      </fieldset>
      <DiscardUnsavedChangesDialog
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onDiscard={() => {
          setIsConfirmOpen(false);
          onDiscardUnsaved?.();
        }}
      />
    </>
  );
}
