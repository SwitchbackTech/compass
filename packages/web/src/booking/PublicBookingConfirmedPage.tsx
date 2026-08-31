import { useParams, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import { PublicBookingFocusedStatus } from "@web/booking/PublicBookingFocusedStatus";
import { usePublicBookingReservationQuery } from "@web/booking/public-booking.query";

function cancelUrlFromHistory(state: unknown): string | undefined {
  if (
    state &&
    typeof state === "object" &&
    "cancelUrl" in state &&
    typeof state.cancelUrl === "string" &&
    state.cancelUrl.length > 0
  ) {
    return state.cancelUrl;
  }
  return undefined;
}

export function PublicBookingConfirmedPage() {
  const { reservationId } = useParams({
    from: "/book/confirmed/$reservationId",
  });
  const cancelUrl = useRouterState({
    select: (routerState) => cancelUrlFromHistory(routerState.location.state),
  });
  const reservationQuery = usePublicBookingReservationQuery(reservationId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const viewKey = reservationQuery.isLoading
    ? "loading"
    : reservationQuery.isError
      ? reservationQuery.error instanceof PublicBookingNotFoundError
        ? "not-found"
        : "error"
      : (reservationQuery.data?.status ?? "not-found");

  // biome-ignore lint/correctness/useExhaustiveDependencies: viewKey is the view key
  useEffect(() => {
    headingRef.current?.focus();
  }, [viewKey]);

  if (reservationQuery.isLoading) {
    return (
      <PublicBookingFocusedStatus
        title="Loading booking"
        description="One moment while we load this confirmation."
      />
    );
  }

  if (reservationQuery.isError) {
    if (reservationQuery.error instanceof PublicBookingNotFoundError) {
      return (
        <PublicBookingFocusedStatus
          title="Booking not found"
          description="This confirmation link may be incorrect or no longer available."
        />
      );
    }
    return (
      <PublicBookingFocusedStatus
        title="Could not load booking"
        description="Please refresh and try again."
      />
    );
  }

  if (!reservationQuery.data) {
    return (
      <PublicBookingFocusedStatus
        title="Booking not found"
        description="This confirmation link may be incorrect or no longer available."
      />
    );
  }

  const reservation = reservationQuery.data;
  if (reservation.status === "cancelled") {
    return (
      <PublicBookingFocusedStatus
        title="This booking was canceled"
        description="The appointment is no longer on the host calendar. You can close this page."
      />
    );
  }

  return (
    <PublicBookingConfirmationView
      headingRef={headingRef}
      hostDisplayName={reservation.hostDisplayName}
      durationMinutes={reservation.durationMinutes}
      slotStart={reservation.slotStart}
      timeZone={reservation.guestTimeZone}
      cancelUrl={cancelUrl}
    />
  );
}

export default PublicBookingConfirmedPage;
