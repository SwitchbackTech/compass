import { useParams, useSearch } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  PublicBookingApi,
  PublicBookingNotFoundError,
} from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingSlotSummary } from "@web/booking/PublicBookingSlotSummary";
import {
  PUBLIC_BOOKING_HEADING_CLASS,
  PublicBookingStatusMessage,
} from "@web/booking/PublicBookingStatusMessage";
import { usePublicBookingReservationQuery } from "@web/booking/public-booking.query";
import { useBookingDocumentTitle } from "@web/booking/use-booking-document-title";
import { useBookingHeadingFocus } from "@web/booking/use-booking-heading-focus";

type CancelActionState =
  | "idle"
  | "cancelling"
  | "cancelled"
  | "not-found"
  | "error";

const BOOKING_NOT_FOUND = {
  title: "Booking not found",
  description: "This cancel link may be invalid or already used.",
} as const;

const BOOKING_CANCELED = {
  title: "Booking canceled",
  description: "Your appointment has been canceled. You can close this page.",
} as const;

const BOOKING_CANCEL_FAILED = {
  title: "Could not cancel booking",
  description: "Please try again or use the link from your calendar invite.",
} as const;

const BOOKING_LOADING = {
  title: "Loading booking",
  description: "One moment while we load this booking.",
} as const;

type CancelPageView =
  | { kind: "status"; title: string; description: string }
  | {
      kind: "confirm";
      reservation: NonNullable<
        ReturnType<typeof usePublicBookingReservationQuery>["data"]
      >;
    };

const resolveCancelPageView = (
  canLoad: boolean,
  action: CancelActionState,
  reservationQuery: ReturnType<typeof usePublicBookingReservationQuery>,
): CancelPageView => {
  if (!canLoad || action === "not-found") {
    return { kind: "status", ...BOOKING_NOT_FOUND };
  }
  if (action === "cancelled") return { kind: "status", ...BOOKING_CANCELED };
  if (action === "error") return { kind: "status", ...BOOKING_CANCEL_FAILED };
  if (reservationQuery.isLoading) return { kind: "status", ...BOOKING_LOADING };
  if (reservationQuery.isError) {
    return {
      kind: "status",
      ...(reservationQuery.error instanceof PublicBookingNotFoundError
        ? BOOKING_NOT_FOUND
        : BOOKING_CANCEL_FAILED),
    };
  }
  const reservation = reservationQuery.data;
  if (!reservation) return { kind: "status", ...BOOKING_NOT_FOUND };
  if (reservation.status === "cancelled") {
    return { kind: "status", ...BOOKING_CANCELED };
  }
  return { kind: "confirm", reservation };
};

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

  const view = resolveCancelPageView(canLoad, action, reservationQuery);
  if (view.kind === "status") {
    return <PublicBookingStatusMessage {...view} />;
  }

  const { reservation } = view;
  const busy = action === "cancelling";
  return (
    <PublicBookingLayout>
      <section aria-busy={busy} aria-labelledby="booking-cancel-heading">
        <h1
          ref={headingRef}
          id="booking-cancel-heading"
          tabIndex={-1}
          className={PUBLIC_BOOKING_HEADING_CLASS}
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
