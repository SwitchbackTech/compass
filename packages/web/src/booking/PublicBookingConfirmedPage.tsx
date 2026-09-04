import {
  useNavigate,
  useParams,
  useRouterState,
  useSearch,
} from "@tanstack/react-router";
import { useState } from "react";
import { getErrorStatus } from "@web/api/util/api.util";
import { PublicBookingConfirmationView } from "@web/booking/PublicBookingConfirmationView";
import { PublicBookingEditDetailsForm } from "@web/booking/PublicBookingEditDetailsForm";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";
import {
  usePatchPublicBookingReservationMutation,
  usePublicBookingReservationQuery,
} from "@web/booking/public-booking.query";
import {
  type PublicBookingReservationView,
  resolvePublicBookingReservationView,
} from "@web/booking/public-booking.view";
import {
  publicCancelUrlForReservation,
  tokenFromGuestActionUrl,
} from "@web/booking/public-booking-search";
import { useBookingDocumentTitle } from "@web/booking/use-booking-document-title";
import { requestPublicBookingPageHeadingFocus } from "@web/booking/use-booking-heading-focus";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

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

const resolveConfirmedPageView = (
  reservationQuery: ReturnType<typeof usePublicBookingReservationQuery>,
): PublicBookingReservationView =>
  resolvePublicBookingReservationView(reservationQuery, {
    loading: BOOKING_LOADING,
    notFound: BOOKING_NOT_FOUND,
    loadFailed: BOOKING_LOAD_FAILED,
    cancelled: BOOKING_CANCELED,
  });

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
  const { token: searchToken } = useSearch({
    from: "/book/confirmed/$reservationId",
  });
  const historyCancelUrl = useRouterState({
    select: (routerState) => cancelUrlFromHistory(routerState.location.state),
  });
  const token =
    searchToken ||
    (historyCancelUrl ? tokenFromGuestActionUrl(historyCancelUrl) : "");
  const cancelUrl =
    historyCancelUrl ??
    (token
      ? publicCancelUrlForReservation(
          reservationId,
          token,
          window.location.origin,
        )
      : undefined);
  const reservationQuery = usePublicBookingReservationQuery(reservationId);
  const patchReservation =
    usePatchPublicBookingReservationMutation(reservationId);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useBookingDocumentTitle("Booking confirmed");
  const navigate = useNavigate();

  const view = resolveConfirmedPageView(reservationQuery);
  const bookingSlug =
    view.kind === "reservation" ? view.reservation.bookingSlug : "";
  const canEdit = view.kind === "reservation" && token.length > 0;

  // Escape returns to the host's public page. OverlayPanel peels first.
  // An open edit form backs out one step. Unknown and cancelled views have
  // no slug path, so they stay put.
  useAppShortcut(
    "Escape",
    (event) => {
      if (isHigherEscapeOwner()) {
        return;
      }
      event.preventDefault();
      if (isEditing) {
        setIsEditing(false);
        setSaveError(null);
        return;
      }
      requestPublicBookingPageHeadingFocus();
      void navigate({
        to: ROOT_ROUTES.BOOK,
        params: { username: bookingSlug },
      });
    },
    { enabled: bookingSlug.length > 0, ignoreInputs: false },
  );

  if (view.kind === "status") {
    return <PublicBookingStatusMessage {...view} />;
  }

  const { reservation } = view;

  if (isEditing && canEdit) {
    return (
      <PublicBookingEditDetailsForm
        guestName={reservation.guestName}
        notes={reservation.notes ?? ""}
        disabled={patchReservation.isPending}
        error={saveError}
        onCancel={() => {
          setIsEditing(false);
          setSaveError(null);
        }}
        onSubmit={(values) => {
          setSaveError(null);
          patchReservation.mutate(
            { token, name: values.name, notes: values.notes },
            {
              onSuccess: () => {
                setIsEditing(false);
              },
              onError: (error) => {
                setSaveError(
                  getErrorStatus(error) === 404
                    ? "This booking could not be updated. Use the link in your invite."
                    : "Could not save your details. Please try again.",
                );
              },
            },
          );
        }}
      />
    );
  }

  return (
    <PublicBookingConfirmationView
      hostDisplayName={reservation.hostDisplayName}
      guestName={reservation.guestName}
      notes={reservation.notes}
      durationMinutes={reservation.durationMinutes}
      slotStart={reservation.slotStart}
      timeZone={reservation.guestTimeZone}
      createsGoogleMeet={reservation.createsGoogleMeet}
      cancelUrl={cancelUrl}
      onEditDetails={
        canEdit
          ? () => {
              setSaveError(null);
              setIsEditing(true);
            }
          : undefined
      }
    />
  );
}
