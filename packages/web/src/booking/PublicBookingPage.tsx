import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CreateBookingReservationInputSchema } from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import {
  type PublicBookingGuestDetails,
  PublicBookingGuestForm,
  type PublicBookingGuestFormValues,
} from "@web/booking/PublicBookingGuestForm";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingMonthGrid } from "@web/booking/PublicBookingMonthGrid";
import { PublicBookingSlotPicker } from "@web/booking/PublicBookingSlotPicker";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import {
  formatBookingMonthKey,
  formatBookingSlotDateKey,
  formatDurationMinutes,
} from "@web/booking/public-booking.format";
import {
  isPublicBookingConflictError,
  type PublicBookingConfirmation,
  prefetchPublicBookingMonth,
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
  const conflictAlertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (conflictMessage) {
      conflictAlertRef.current?.focus();
    }
  }, [conflictMessage]);

  usePrefetchAdjacentBookingMonths(
    slug,
    monthKey,
    guestTimeZone,
    pageQuery.data?.maxHorizonDays,
    pageQuery.isSuccess && pageQuery.data.enabled && slotsQuery.isSuccess,
  );

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

  const showGuestForm = selectedSlotStart !== null || conflictMessage !== null;
  const slotsPending = slotsQuery.isLoading && !slotsQuery.data;

  const handleSelectSlot = (slotStart: string) => {
    setSelectedSlotStart(slotStart);
    setSelectedDateKey(formatBookingSlotDateKey(slotStart, guestTimeZone));
    setConflictMessage(null);
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

  const handleSubmit = async (values: PublicBookingGuestFormValues) => {
    if (!selectedSlotStart) {
      return;
    }

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
        await slotsQuery.refetch();
        return;
      }
      setConflictMessage("Could not confirm this booking. Please try again.");
    }
  };

  return (
    <PublicBookingLayout>
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-text text-xl">
          Book with {page.hostDisplayName}
        </h1>
        <p className="text-sm text-text-muted">
          {formatDurationMinutes(page.durationMinutes)} meeting
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

      <PublicBookingMonthGrid
        monthKey={monthKey}
        timeZone={guestTimeZone}
        maxHorizonDays={page.maxHorizonDays}
        slots={slotsQuery.data?.slots ?? []}
        selectedDateKey={selectedDateKey}
        onMonthChange={handleMonthChange}
        onPrefetchMonth={handlePrefetchMonth}
        onSelectDate={handleSelectDay}
      />

      {slotsPending ? (
        <p className="text-sm text-text-muted">Loading open times...</p>
      ) : slotsQuery.isError || !slotsQuery.data ? (
        <p className="text-sm text-text-muted">
          Could not load times. Please refresh and try again.
        </p>
      ) : (
        <PublicBookingSlotPicker
          slots={slotsQuery.data.slots}
          guestTimeZone={guestTimeZone}
          selectedSlotStart={selectedSlotStart}
          onSelectSlot={handleSelectSlot}
        />
      )}

      {showGuestForm ? (
        <PublicBookingGuestForm
          disabled={createReservation.isPending}
          submitDisabled={!selectedSlotStart}
          values={guestDetails}
          onChange={setGuestDetails}
          onSubmit={handleSubmit}
        />
      ) : (
        <p className="text-sm text-text-muted">Select a time to continue.</p>
      )}
    </PublicBookingLayout>
  );
}

export default PublicBookingPage;
