import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  type BookingSlotsResponse,
  CreateBookingReservationInputSchema,
} from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import { PublicBookingDetailsStep } from "@web/booking/PublicBookingDetailsStep";
import {
  type PublicBookingGuestDetails,
  PublicBookingGuestForm,
  type PublicBookingGuestFormValues,
} from "@web/booking/PublicBookingGuestForm";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingPicker } from "@web/booking/PublicBookingPicker";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import {
  findNextAvailableBookingDate,
  formatBookingDateKey,
  formatBookingMonthKey,
  formatBookingSlotDateKey,
  formatDurationMinutes,
  formatGuestTimeZoneLabel,
  listBookingAvailableDateKeysInMonth,
  shiftBookingMonthKey,
} from "@web/booking/public-booking.format";
import {
  isPublicBookingConflictError,
  type PublicBookingConfirmation,
  prefetchPublicBookingMonth,
  publicBookingQueryKeys,
  useCreatePublicBookingReservationMutation,
  usePrefetchAdjacentBookingMonths,
  usePublicBookingPageQuery,
  usePublicBookingSlotsQuery,
} from "@web/booking/public-booking.query";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

const EMPTY_GUEST_DETAILS: PublicBookingGuestDetails = {
  guestName: "",
  guestEmail: "",
  notes: "",
};

export function PublicBookingPage() {
  const { username } = useParams({ from: "/book/$username" });
  const slug = username ?? "";
  const guestTimeZone = getBrowserTimeZone();
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState(() =>
    formatBookingMonthKey(dayjs(), guestTimeZone),
  );

  const pageQuery = usePublicBookingPageQuery(slug);
  const slotsQuery = usePublicBookingSlotsQuery(
    slug,
    monthKey,
    pageQuery.data?.maxHorizonDays,
  );
  const createReservation = useCreatePublicBookingReservationMutation(slug);

  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    null,
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [guestDetails, setGuestDetails] =
    useState<PublicBookingGuestDetails>(EMPTY_GUEST_DETAILS);
  const [confirmation, setConfirmation] =
    useState<PublicBookingConfirmation | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"picker" | "details">("picker");
  const conflictAlertRef = useRef<HTMLParagraphElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const submitInFlightRef = useRef(false);
  const pendingPickerFocusRef = useRef(false);

  useEffect(() => {
    if (conflictMessage) {
      conflictAlertRef.current?.focus();
    }
  }, [conflictMessage]);

  useEffect(() => {
    if (step === "details") {
      detailsHeadingRef.current?.focus();
      return;
    }
    if (pendingPickerFocusRef.current) {
      pendingPickerFocusRef.current = false;
      pickerHeadingRef.current?.focus();
    }
  }, [step]);

  usePrefetchAdjacentBookingMonths(
    slug,
    monthKey,
    guestTimeZone,
    pageQuery.data?.maxHorizonDays,
    pageQuery.isSuccess && pageQuery.data.enabled && slotsQuery.isSuccess,
  );

  useEffect(() => {
    if (!slotsQuery.data?.bookable) {
      return;
    }
    const todayKey = formatBookingDateKey(dayjs(), guestTimeZone);
    const available = listBookingAvailableDateKeysInMonth(
      slotsQuery.data.slots,
      monthKey,
      guestTimeZone,
      todayKey,
    );
    if (selectedDateKey && available.includes(selectedDateKey)) {
      return;
    }
    if (selectedDateKey?.startsWith(monthKey)) {
      return;
    }
    setSelectedDateKey(available[0] ?? null);
  }, [guestTimeZone, monthKey, selectedDateKey, slotsQuery.data]);

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

  if (confirmation) {
    return (
      <PublicBookingConfirmationView
        hostDisplayName={page.hostDisplayName}
        durationMinutes={page.durationMinutes}
        confirmation={confirmation}
      />
    );
  }

  if (slotsQuery.data && !slotsQuery.data.bookable) {
    return (
      <PublicBookingStatusMessage
        title="Booking temporarily unavailable"
        description="The host calendar is not ready for new bookings. Please try again later."
      />
    );
  }

  const showDetailsStep = step === "details" && selectedSlotStart !== null;
  const showConflictForm = !showDetailsStep && conflictMessage !== null;
  const slotsHasData = Boolean(slotsQuery.data);
  const slotsFetching =
    !slotsHasData && (slotsQuery.isPending || slotsQuery.isFetching);
  const slotsError = Boolean(slotsQuery.isError && !slotsHasData);
  const slotsPending = slotsFetching && !slotsError;

  const handleSelectSlot = (slotStart: string) => {
    setSelectedSlotStart(slotStart);
    setSelectedDateKey(formatBookingSlotDateKey(slotStart, guestTimeZone));
    setConflictMessage(null);
    setStep("details");
  };

  const handleSelectDay = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    if (
      selectedSlotStart &&
      formatBookingSlotDateKey(selectedSlotStart, guestTimeZone) !== dateKey
    ) {
      setSelectedSlotStart(null);
    }
  };

  const handleMonthChange = (nextMonthKey: string) => {
    setMonthKey(nextMonthKey);
    setSelectedSlotStart(null);
    setSelectedDateKey(null);
    setConflictMessage(null);
    setStep("picker");
  };

  const handleChangeTime = () => {
    pendingPickerFocusRef.current = true;
    setStep("picker");
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
    const todayKey = formatBookingDateKey(dayjs(), guestTimeZone);
    const slotsByMonth = new Map<
      string,
      BookingSlotsResponse["slots"] | undefined
    >();
    let cursor = monthKey;
    for (let step = 0; step < 14; step += 1) {
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
        return;
      }
      if (next.dateKey) {
        setSelectedSlotStart(null);
        setConflictMessage(null);
        setStep("picker");
        setMonthKey(next.monthKey);
        setSelectedDateKey(next.dateKey);
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
  };

  const handleSubmit = async (values: PublicBookingGuestFormValues) => {
    if (!selectedSlotStart || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setConflictMessage(null);

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
      setConfirmation(result);
    } catch (error) {
      if (isPublicBookingConflictError(error)) {
        setConflictMessage(
          "This time is no longer available. Pick another slot.",
        );
        setSelectedSlotStart(null);
        setStep("picker");
        await slotsQuery.refetch();
        return;
      }
      setConflictMessage("Could not confirm this booking. Please try again.");
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return (
    <PublicBookingLayout wide>
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-text text-xl">
          Book with {page.hostDisplayName}
        </h1>
        <p className="text-sm text-text-muted">
          {formatDurationMinutes(page.durationMinutes)} meeting
        </p>
        <p className="text-sm text-text-muted">
          Times shown in your timezone (
          {formatGuestTimeZoneLabel(guestTimeZone)}).
        </p>
      </header>

      {conflictMessage ? (
        <p
          ref={conflictAlertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-warning/40 bg-surface-panel px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {conflictMessage}
        </p>
      ) : null}

      {showDetailsStep && selectedSlotStart ? (
        <div className="sticky bottom-0 z-10 -mx-4 border-border border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:py-0">
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
            <div className="sticky bottom-0 z-10 -mx-4 border-border border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:py-0">
              <PublicBookingGuestForm
                disabled={createReservation.isPending}
                submitDisabled={!selectedSlotStart}
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

export default PublicBookingPage;
