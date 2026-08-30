import { useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicBookingApi } from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";

type CancelState = "loading" | "success" | "not-found" | "error";

export function PublicBookingCancelPage() {
  const { reservationId } = useParams({ from: "/book/cancel/$reservationId" });
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token ?? "";
  const [state, setState] = useState<CancelState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function runCancel() {
      if (!reservationId || !token) {
        if (!cancelled) {
          setState("not-found");
        }
        return;
      }

      try {
        await PublicBookingApi.cancelReservation(reservationId, { token });
        if (!cancelled) {
          setState("success");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (getErrorStatus(error) === 404) {
          setState("not-found");
          return;
        }
        setState("error");
      }
    }

    void runCancel();

    return () => {
      cancelled = true;
    };
  }, [reservationId, token]);

  if (state === "loading") {
    return (
      <PublicBookingStatusMessage
        title="Canceling booking"
        description="One moment while we cancel your appointment."
      />
    );
  }

  if (state === "success") {
    return (
      <PublicBookingStatusMessage
        title="Booking canceled"
        description="Your appointment has been canceled. You can close this page."
      />
    );
  }

  if (state === "not-found") {
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

export default PublicBookingCancelPage;
