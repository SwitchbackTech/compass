import { useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PublicBookingApi } from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingStatusMessage } from "@web/booking/PublicBookingStatusMessage";

type CancelState =
  | "confirm"
  | "cancelling"
  | "cancelled"
  | "not-found"
  | "error";

export function PublicBookingCancelPage() {
  const { reservationId } = useParams({ from: "/book/cancel/$reservationId" });
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token ?? "";
  const [state, setState] = useState<CancelState>(
    reservationId && token ? "confirm" : "not-found",
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inFlightRef = useRef(false);

  // The ref is attached after render; `state` is the view key so focus
  // follows confirm -> cancelled / error instead of staying on a detached node.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state is the view key
  useEffect(() => {
    headingRef.current?.focus();
  }, [state]);

  const handleConfirm = async () => {
    if (!reservationId || !token || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("cancelling");

    try {
      await PublicBookingApi.cancelReservation(reservationId, { token });
      // Idempotent: a second cancel with a valid token is also 200.
      setState("cancelled");
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        setState("not-found");
        return;
      }
      setState("error");
    }
  };

  if (state === "confirm" || state === "cancelling") {
    const busy = state === "cancelling";
    return (
      <PublicBookingLayout>
        <section aria-busy={busy} aria-labelledby="booking-cancel-heading">
          <h1
            ref={headingRef}
            id="booking-cancel-heading"
            tabIndex={-1}
            className="font-semibold text-text text-xl"
          >
            Cancel this booking?
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            This will remove the appointment from the host calendar.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void handleConfirm();
            }}
            className="mt-6 rounded-md bg-accent px-4 py-2 font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Canceling..." : "Cancel this booking"}
          </button>
        </section>
      </PublicBookingLayout>
    );
  }

  if (state === "cancelled") {
    return (
      <PublicBookingStatusMessage
        headingRef={headingRef}
        title="Booking canceled"
        description="Your appointment has been canceled. You can close this page."
      />
    );
  }

  if (state === "not-found") {
    return (
      <PublicBookingStatusMessage
        headingRef={headingRef}
        title="Booking not found"
        description="This cancel link may be invalid or already used."
      />
    );
  }

  return (
    <PublicBookingStatusMessage
      headingRef={headingRef}
      title="Could not cancel booking"
      description="Please try again or use the link from your calendar invite."
    />
  );
}

export default PublicBookingCancelPage;
