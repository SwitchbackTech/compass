import { useParams, useSearch } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  PublicBookingApi,
  PublicBookingNotFoundError,
} from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingSlotSummary } from "@web/booking/PublicBookingSlotSummary";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import { usePublicBookingReservationQuery } from "@web/booking/public-booking.query";
import { useBookingDocumentTitle } from "@web/booking/use-booking-document-title";
import { useBookingHeadingFocus } from "@web/booking/use-booking-heading-focus";

type CancelActionState =
  | "idle"
  | "cancelling"
  | "cancelled"
  | "not-found"
  | "error";

export function PublicBookingCancelPage() {
  const { reservationId } = useParams({ from: "/book/cancel/$reservationId" });
  const search = useSearch({ from: "/book/cancel/$reservationId" });
  const token = search.token ?? "";
  const canLoad = Boolean(reservationId && token);
  const reservationQuery = usePublicBookingReservationQuery(
    canLoad ? reservationId : "",
  );
  const [action, setAction] = useState<CancelActionState>("idle");
  const headingRef = useBookingHeadingFocus(
    `${action}:${reservationQuery.status}:${reservationQuery.data?.status ?? ""}`,
  );
  const inFlightRef = useRef(false);
  useBookingDocumentTitle("Cancel booking");

  const handleConfirm = async () => {
    if (!reservationId || !token || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setAction("cancelling");

    try {
      await PublicBookingApi.cancelReservation(reservationId, { token });
      setAction("cancelled");
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        setAction("not-found");
        return;
      }
      setAction("error");
    }
  };

  if (!canLoad || action === "not-found") {
    return (
      <PublicBookingStatusMessage
        title="Booking not found"
        description="This cancel link may be invalid or already used."
      />
    );
  }

  if (action === "cancelled") {
    return (
      <PublicBookingStatusMessage
        title="Booking canceled"
        description="Your appointment has been canceled. You can close this page."
      />
    );
  }

  if (action === "error") {
    return (
      <PublicBookingStatusMessage
        title="Could not cancel booking"
        description="Please try again or use the link from your calendar invite."
      />
    );
  }

  if (reservationQuery.isLoading) {
    return (
      <PublicBookingStatusMessage
        title="Loading booking"
        description="One moment while we load this booking."
      />
    );
  }

  if (reservationQuery.isError) {
    if (reservationQuery.error instanceof PublicBookingNotFoundError) {
      return (
        <PublicBookingStatusMessage
          title="Booking not found"
          description="This cancel link may be invalid or already used."
        />
      );
    }
    return (
      <PublicBookingStatusMessage
        title="Could not cancel booking"
        description="Please try again or use the link from your calendar invite."
      />
    );
  }

  const reservation = reservationQuery.data;
  if (!reservation) {
    return (
      <PublicBookingStatusMessage
        title="Booking not found"
        description="This cancel link may be invalid or already used."
      />
    );
  }

  if (reservation.status === "cancelled") {
    return (
      <PublicBookingStatusMessage
        title="Booking canceled"
        description="Your appointment has been canceled. You can close this page."
      />
    );
  }

  const busy = action === "cancelling";
  return (
    <PublicBookingLayout>
      <section aria-busy={busy} aria-labelledby="booking-cancel-heading">
        <h1
          ref={headingRef}
          id="booking-cancel-heading"
          tabIndex={-1}
          className="font-semibold text-text text-xl focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Cancel this booking?
        </h1>
        <p className="mt-2 text-sm text-text">
          You are canceling a booking with {reservation.hostDisplayName}.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          This will remove the appointment from the host calendar.
        </p>
        <div className="mt-4">
          <PublicBookingSlotSummary
            durationMinutes={reservation.durationMinutes}
            slotStart={reservation.slotStart}
            timeZone={reservation.guestTimeZone}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleConfirm();
          }}
          className="c-button c-button-primary mt-6"
        >
          {busy ? "Canceling..." : "Cancel this booking"}
        </button>
      </section>
    </PublicBookingLayout>
  );
}
