import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { CreateBookingReservationInputSchema } from "@core/types/booking.contracts";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import {
  PublicBookingGuestForm,
  type PublicBookingGuestFormValues,
} from "@web/booking/PublicBookingGuestForm";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingSlotPicker } from "@web/booking/PublicBookingSlotPicker";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import { formatDurationMinutes } from "@web/booking/public-booking.format";
import {
  isPublicBookingConflictError,
  type PublicBookingConfirmation,
  useCreatePublicBookingReservationMutation,
  usePublicBookingPageQuery,
  usePublicBookingSlotsQuery,
} from "@web/booking/public-booking.query";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

export function PublicBookingPage() {
  const { username } = useParams({ from: "/book/$username" });
  const slug = username ?? "";
  const guestTimeZone = getBrowserTimeZone();

  const pageQuery = usePublicBookingPageQuery(slug);
  const slotsQuery = usePublicBookingSlotsQuery(
    slug,
    pageQuery.isSuccess && pageQuery.data.enabled,
  );
  const createReservation = useCreatePublicBookingReservationMutation(slug);

  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    null,
  );
  const [confirmation, setConfirmation] =
    useState<PublicBookingConfirmation | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

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

  if (slotsQuery.isLoading) {
    return (
      <PublicBookingStatusMessage
        title={`Book with ${page.hostDisplayName}`}
        description="Loading open times..."
      />
    );
  }

  if (slotsQuery.isError || !slotsQuery.data) {
    return (
      <PublicBookingStatusMessage
        title="Could not load times"
        description="Please refresh and try again."
      />
    );
  }

  if (!slotsQuery.data.bookable) {
    return (
      <PublicBookingStatusMessage
        title="Booking temporarily unavailable"
        description="The host calendar is not ready for new bookings. Please try again later."
      />
    );
  }

  const slots = slotsQuery.data;

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
        <h1 className="font-semibold text-xl text-text">
          Book with {page.hostDisplayName}
        </h1>
        <p className="text-sm text-text-muted">
          {formatDurationMinutes(page.durationMinutes)} meeting
        </p>
      </header>

      {conflictMessage ? (
        <p
          role="alert"
          className="rounded-md border border-warning/40 bg-surface-panel px-3 py-2 text-sm text-text"
        >
          {conflictMessage}
        </p>
      ) : null}

      <PublicBookingSlotPicker
        slots={slots.slots}
        guestTimeZone={guestTimeZone}
        selectedSlotStart={selectedSlotStart}
        onSelectSlot={setSelectedSlotStart}
      />

      {selectedSlotStart ? (
        <PublicBookingGuestForm
          disabled={createReservation.isPending}
          onSubmit={handleSubmit}
        />
      ) : (
        <p className="text-sm text-text-muted">Select a time to continue.</p>
      )}
    </PublicBookingLayout>
  );
}

export default PublicBookingPage;
