import { useParams, useRouterState } from "@tanstack/react-router";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import { usePublicBookingReservationQuery } from "@web/booking/public-booking.query";
import { useBookingDocumentTitle } from "@web/booking/use-booking-document-title";

const BOOKING_LOADING = {
  title: "Loading booking",
  description: "One moment while we load this confirmation.",
} as const;

const BOOKING_NOT_FOUND = {
  title: "Booking not found",
  description:
    "This confirmation link may be incorrect or no longer available.",
} as const;

const BOOKING_LOAD_FAILED = {
  title: "Could not load booking",
  description: "Please refresh and try again.",
} as const;

const BOOKING_CANCELED = {
  title: "This booking was canceled",
  description:
    "The appointment is no longer on the host calendar. You can close this page.",
} as const;

type ConfirmedPageView =
  | { kind: "status"; title: string; description: string }
  | {
      kind: "confirmation";
      reservation: NonNullable<
        ReturnType<typeof usePublicBookingReservationQuery>["data"]
      >;
    };

const resolveConfirmedPageView = (
  reservationQuery: ReturnType<typeof usePublicBookingReservationQuery>,
): ConfirmedPageView => {
  if (reservationQuery.isLoading) return { kind: "status", ...BOOKING_LOADING };
  if (reservationQuery.isError) {
    return {
      kind: "status",
      ...(reservationQuery.error instanceof PublicBookingNotFoundError
        ? BOOKING_NOT_FOUND
        : BOOKING_LOAD_FAILED),
    };
  }
  const reservation = reservationQuery.data;
  if (!reservation) return { kind: "status", ...BOOKING_NOT_FOUND };
  if (reservation.status === "cancelled") {
    return { kind: "status", ...BOOKING_CANCELED };
  }
  return { kind: "confirmation", reservation };
};

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
  useBookingDocumentTitle("Booking confirmed");

  const view = resolveConfirmedPageView(reservationQuery);
  if (view.kind === "status") {
    return <PublicBookingStatusMessage {...view} />;
  }

  const { reservation } = view;
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
