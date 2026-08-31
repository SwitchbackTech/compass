import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type BookingSlotsResponse,
  CreateBookingReservationInputSchema,
} from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import { PublicBookingDetailsStep } from "@web/booking/PublicBookingDetailsStep";
import {
  type PublicBookingGuestDetails,
  PublicBookingGuestForm,
  type PublicBookingGuestFormValues,
} from "@web/booking/PublicBookingGuestForm";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingPicker } from "@web/booking/PublicBookingPicker";
import { PublicBookingSkipLink } from "@web/booking/PublicBookingSkipLink";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import { PublicBookingTimezoneControl } from "@web/booking/PublicBookingTimezoneControl";
import {
  findNextAvailableBookingDate,
  formatBookingDateKey,
  formatBookingMonthKey,
  formatDurationMinutes,
  listBookingAvailableDateKeysInMonth,
  shiftBookingMonthKey,
} from "@web/booking/public-booking.format";
import {
  isPublicBookingConflictError,
  prefetchPublicBookingMonth,
  publicBookingQueryKeys,
  useCreatePublicBookingReservationMutation,
  usePrefetchAdjacentBookingMonths,
  usePublicBookingPageQuery,
  usePublicBookingSlotsQuery,
} from "@web/booking/public-booking.query";
import { type PublicBookingSearch } from "@web/booking/public-booking-search";
import { useBookingDocumentTitle } from "@web/booking/use-booking-document-title";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

const EMPTY_GUEST_DETAILS: PublicBookingGuestDetails = {
  guestName: "",
  guestEmail: "",
  notes: "",
};

const STICKY_STEP_CLASS_NAME =
  "sticky bottom-0 z-10 -mx-4 border-border border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:py-0";

export function PublicBookingPage() {
  const { username } = useParams({ from: "/book/$username" });
  const slug = username ?? "";
  const navigate = useNavigate();
  const search: PublicBookingSearch = useSearch({ from: "/book/$username" });
  const queryClient = useQueryClient();

  // The URL is the source of truth for the guest's selection (month, day,
  // slot, timezone): Back returns from details to the picker instead of
  // leaving the site, refresh keeps the selection, and the link is shareable.
  const browserTimeZone = useMemo(getBrowserTimeZone, []);
  const guestTimeZone = search.tz ?? browserTimeZone;
  const selectedSlotStart = search.slot ?? null;
  const slotDateKey = selectedSlotStart
    ? formatBookingDateKey(selectedSlotStart, guestTimeZone)
    : null;
  const monthKey =
    search.month ??
    slotDateKey?.slice(0, 7) ??
    formatBookingMonthKey(dayjs(), guestTimeZone);

  const pageQuery = usePublicBookingPageQuery(slug);
  const slotsQuery = usePublicBookingSlotsQuery(
    slug,
    monthKey,
    pageQuery.data?.maxHorizonDays,
    guestTimeZone,
  );
  const createReservation = useCreatePublicBookingReservationMutation(slug);

  const [guestDetails, setGuestDetails] =
    useState<PublicBookingGuestDetails>(EMPTY_GUEST_DETAILS);
  // "Change time" shows the picker with the chosen slot still highlighted, so
  // the slot stays in the URL and only this local flag flips the view.
  const [changingTime, setChangingTime] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const submitInFlightRef = useRef(false);
  const pendingPickerFocusRef = useRef(false);

  const showDetailsStep = selectedSlotStart !== null && !changingTime;

  useBookingDocumentTitle(
    pageQuery.data?.enabled
      ? `Book with ${pageQuery.data.hostDisplayName}`
      : null,
  );

  useEffect(() => {
    if (alertMessage) {
      alertRef.current?.focus();
    }
  }, [alertMessage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: jump remounts the picker heading
  useEffect(() => {
    if (showDetailsStep) {
      detailsHeadingRef.current?.focus();
      return;
    }
    if (pendingPickerFocusRef.current) {
      pendingPickerFocusRef.current = false;
      pickerHeadingRef.current?.focus();
    }
  }, [monthKey, search.date, showDetailsStep]);

  usePrefetchAdjacentBookingMonths(
    slug,
    monthKey,
    guestTimeZone,
    pageQuery.data?.maxHorizonDays,
    pageQuery.isSuccess && pageQuery.data.enabled && slotsQuery.isSuccess,
  );

  const todayKey = formatBookingDateKey(dayjs(), guestTimeZone);
  const availableDateKeys = useMemo(
    () =>
      slotsQuery.data?.bookable
        ? listBookingAvailableDateKeysInMonth(
            slotsQuery.data.slots,
            monthKey,
            guestTimeZone,
            todayKey,
          )
        : [],
    [guestTimeZone, monthKey, slotsQuery.data, todayKey],
  );

  // The guest's explicit day pick wins while it is in the month in view (even
  // when it has no open times); otherwise the picked slot's day, otherwise the
  // first day with open times.
  const selectedDateKey =
    (search.date?.startsWith(monthKey) ? search.date : null) ??
    (slotDateKey?.startsWith(monthKey) ? slotDateKey : null) ??
    availableDateKeys[0] ??
    null;

  if (pageQuery.isLoading) {
    return (
      <PublicBookingStatusMessage
        title="Loading booking page"
        description="One moment while we load available times."
      />
    );
  }

  if (
    pageQuery.error instanceof PublicBookingNotFoundError ||
    (pageQuery.isSuccess && !pageQuery.data.enabled)
  ) {
    return (
      <PublicBookingStatusMessage
        title="Booking page not found"
        description="This link may be incorrect or the host has turned booking off."
      />
    );
  }

  if (pageQuery.isError || !pageQuery.isSuccess || !pageQuery.data) {
    return (
      <PublicBookingStatusMessage
        title="Could not load booking page"
        description="Please refresh and try again."
      />
    );
  }

  const page = pageQuery.data;

  if (slotsQuery.data && !slotsQuery.data.bookable) {
    return (
      <PublicBookingStatusMessage
        title="Booking temporarily unavailable"
        description="The host calendar is not ready for new bookings. Please try again later."
      />
    );
  }

  const showConflictForm = !showDetailsStep && alertMessage !== null;
  const slotsHasData = Boolean(slotsQuery.data);
  const slotsFetching =
    !slotsHasData && (slotsQuery.isPending || slotsQuery.isFetching);
  const slotsError = Boolean(slotsQuery.isError && !slotsHasData);
  const slotsPending = slotsFetching && !slotsError;

  const updateSearch = (
    patch: Partial<PublicBookingSearch>,
    { push = false }: { push?: boolean } = {},
  ) => {
    void navigate({
      to: ".",
      search: (previous: PublicBookingSearch) => ({ ...previous, ...patch }),
      replace: !push,
    });
  };

  const handleSelectSlot = (slotStart: string) => {
    setAlertMessage(null);
    setChangingTime(false);
    // Push, not replace: Back from the details step returns to the picker.
    updateSearch(
      { slot: slotStart, date: formatBookingDateKey(slotStart, guestTimeZone) },
      { push: true },
    );
  };

  const handleSelectDay = (dateKey: string) => {
    updateSearch({
      date: dateKey,
      slot: slotDateKey !== dateKey ? undefined : search.slot,
    });
  };

  const handleMonthChange = (nextMonthKey: string) => {
    setAlertMessage(null);
    setChangingTime(false);
    updateSearch({ month: nextMonthKey, date: undefined, slot: undefined });
  };

  const handleTimeZoneChange = (nextTimeZone: string) => {
    if (nextTimeZone === guestTimeZone) {
      return;
    }
    if (selectedSlotStart) {
      // Keep the slot; its day and month re-derive in the new zone.
      updateSearch({ tz: nextTimeZone, month: undefined, date: undefined });
      return;
    }
    const currentMonthInOldZone = formatBookingMonthKey(dayjs(), guestTimeZone);
    updateSearch({
      tz: nextTimeZone,
      date: undefined,
      // Re-snap to "this month" in the new zone; keep an explicitly browsed
      // month as-is.
      month: monthKey === currentMonthInOldZone ? undefined : search.month,
    });
  };

  const handleChangeTime = () => {
    pendingPickerFocusRef.current = true;
    setChangingTime(true);
  };

  const handlePrefetchMonth = (nextMonthKey: string) => {
    void prefetchPublicBookingMonth(
      queryClient,
      slug,
      nextMonthKey,
      guestTimeZone,
      page.maxHorizonDays,
    );
  };

  const handleJumpToNextAvailable = async () => {
    const slotsByMonth = new Map<
      string,
      BookingSlotsResponse["slots"] | undefined
    >();
    let cursor = monthKey;
    for (let offset = 0; offset < 14; offset += 1) {
      const cached = queryClient.getQueryData<BookingSlotsResponse>(
        publicBookingQueryKeys.slots(slug, cursor, guestTimeZone),
      );
      if (cached) {
        slotsByMonth.set(cursor, cached.slots);
      }
      cursor = shiftBookingMonthKey(cursor, 1, guestTimeZone);
    }
    if (slotsQuery.data && !slotsByMonth.has(monthKey)) {
      slotsByMonth.set(monthKey, slotsQuery.data.slots);
    }

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const next = findNextAvailableBookingDate(
        monthKey,
        selectedDateKey,
        slotsByMonth,
        guestTimeZone,
        todayKey,
        page.maxHorizonDays,
      );
      if (!next) {
        break;
      }
      if (next.dateKey) {
        pendingPickerFocusRef.current = true;
        setAlertMessage(null);
        updateSearch({
          month: next.monthKey,
          date: next.dateKey,
          slot: undefined,
        });
        return;
      }
      await prefetchPublicBookingMonth(
        queryClient,
        slug,
        next.monthKey,
        guestTimeZone,
        page.maxHorizonDays,
      );
      const fetched = queryClient.getQueryData<BookingSlotsResponse>(
        publicBookingQueryKeys.slots(slug, next.monthKey, guestTimeZone),
      );
      slotsByMonth.set(next.monthKey, fetched?.slots ?? []);
    }
    // Every month up to the horizon came back empty - say so instead of
    // silently doing nothing.
    setAlertMessage(
      `No open times in the next ${page.maxHorizonDays} days. Check back later.`,
    );
  };

  const handleSubmit = async (values: PublicBookingGuestFormValues) => {
    if (!selectedSlotStart || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setAlertMessage(null);

    try {
      const result = await createReservation.mutateAsync(
        CreateBookingReservationInputSchema.parse({
          slotStart: selectedSlotStart,
          guestName: values.guestName,
          guestEmail: values.guestEmail,
          notes: values.notes || undefined,
          guestTimeZone: values.guestTimeZone,
        }),
      );
      await navigate({
        to: ROOT_ROUTES.BOOK_CONFIRMED,
        params: { reservationId: result.reservationId },
        // Post-submit only: the public GET cannot reconstruct the cancel token.
        state: { cancelUrl: result.cancelUrl } as never,
      });
    } catch (error) {
      if (isPublicBookingConflictError(error)) {
        setAlertMessage("This time is no longer available. Pick another slot.");
        setChangingTime(false);
        updateSearch({ slot: undefined });
        await slotsQuery.refetch();
        return;
      }
      if (getErrorStatus(error) === 404) {
        // The host disabled the page mid-flow; the refetch flips the whole
        // page to its not-found state.
        setAlertMessage("This booking page is no longer available.");
        await pageQuery.refetch();
        return;
      }
      setAlertMessage("Could not confirm this booking. Please try again.");
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return (
    <PublicBookingLayout wide>
      <PublicBookingSkipLink
        href={
          showDetailsStep ? "#booking-form-heading" : "#booking-slots-heading"
        }
        label={showDetailsStep ? "Skip to your details" : "Skip to open times"}
      />
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-text text-xl">
          Book with {page.hostDisplayName}
        </h1>
        <p className="text-sm text-text-muted">
          {formatDurationMinutes(page.durationMinutes)} meeting
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-text-muted">
          <p>Times shown in your timezone</p>
          <PublicBookingTimezoneControl
            timeZone={guestTimeZone}
            onChange={handleTimeZoneChange}
          />
        </div>
      </header>

      {alertMessage ? (
        <p
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-warning/40 bg-surface-panel px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {alertMessage}
        </p>
      ) : null}

      {showDetailsStep && selectedSlotStart ? (
        <div className={STICKY_STEP_CLASS_NAME}>
          <PublicBookingDetailsStep
            headingRef={detailsHeadingRef}
            slotStart={selectedSlotStart}
            durationMinutes={page.durationMinutes}
            timeZone={guestTimeZone}
            disabled={createReservation.isPending}
            values={guestDetails}
            onChange={setGuestDetails}
            onSubmit={handleSubmit}
            onChangeTime={handleChangeTime}
          />
        </div>
      ) : (
        <>
          <PublicBookingPicker
            monthKey={monthKey}
            timeZone={guestTimeZone}
            maxHorizonDays={page.maxHorizonDays}
            slots={slotsQuery.data?.slots ?? []}
            slotsPending={slotsPending}
            slotsError={slotsError}
            slotsFetching={slotsFetching}
            selectedDateKey={selectedDateKey}
            selectedSlotStart={selectedSlotStart}
            slotsHeadingRef={pickerHeadingRef}
            onMonthChange={handleMonthChange}
            onPrefetchMonth={handlePrefetchMonth}
            onSelectDate={handleSelectDay}
            onSelectSlot={handleSelectSlot}
            onJumpToNextAvailable={() => {
              void handleJumpToNextAvailable();
            }}
            onRetrySlots={() => {
              void slotsQuery.refetch();
            }}
          />

          {showConflictForm ? (
            <div className={STICKY_STEP_CLASS_NAME}>
              <PublicBookingGuestForm
                disabled={createReservation.isPending}
                submitDisabled={!selectedSlotStart}
                guestTimeZone={guestTimeZone}
                values={guestDetails}
                onChange={setGuestDetails}
                onSubmit={handleSubmit}
              />
            </div>
          ) : selectedSlotStart ? null : (
            <p className="text-sm text-text-muted">
              Select a time to continue.
            </p>
          )}
        </>
      )}
    </PublicBookingLayout>
  );
}
