import { useParams, useRouterState } from "@tanstack/react-router";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
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

  if (reservationQuery.isLoading) {
    return (
      <PublicBookingStatusMessage
        title="Loading booking"
        description="One moment while we load this confirmation."
      />
    );
  }

  if (reservationQuery.isError) {
    if (reservationQuery.error instanceof PublicBookingNotFoundError) {
      return (
        <PublicBookingStatusMessage
          title="Booking not found"
          description="This confirmation link may be incorrect or no longer available."
        />
      );
    }
    return (
      <PublicBookingStatusMessage
        title="Could not load booking"
        description="Please refresh and try again."
      />
    );
  }

  if (!reservationQuery.data) {
    return (
      <PublicBookingStatusMessage
        title="Booking not found"
        description="This confirmation link may be incorrect or no longer available."
      />
    );
  }

  const reservation = reservationQuery.data;
  if (reservation.status === "cancelled") {
    return (
      <PublicBookingStatusMessage
        title="This booking was canceled"
        description="The appointment is no longer on the host calendar. You can close this page."
      />
    );
  }

  return (
    <PublicBookingConfirmationView
      hostDisplayName={reservation.hostDisplayName}
      durationMinutes={reservation.durationMinutes}
      slotStart={reservation.slotStart}
      timeZone={reservation.guestTimeZone}
      cancelUrl={cancelUrl}
    />
  );
}

export default PublicBookingConfirmedPage;
