import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import {
  formatBookingSlotLabel,
  formatDurationMinutes,
} from "@web/booking/public-booking.format";
import { type PublicBookingConfirmation } from "@web/booking/public-booking.query";

interface PublicBookingConfirmationViewProps {
  hostDisplayName: string;
  durationMinutes: number;
  confirmation: PublicBookingConfirmation;
}

export function PublicBookingConfirmationView({
  hostDisplayName,
  durationMinutes,
  confirmation,
}: PublicBookingConfirmationViewProps) {
  const when = formatBookingSlotLabel(
    confirmation.slotStart,
    confirmation.guestTimeZone,
  );

  return (
    <PublicBookingLayout>
      <section aria-labelledby="booking-confirmation-heading">
        <h1
          id="booking-confirmation-heading"
          className="font-semibold text-xl text-text"
        >
          You are booked with {hostDisplayName}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {when} ({formatDurationMinutes(durationMinutes)})
        </p>
        <p className="mt-4 text-sm text-text">
          A calendar invite is on its way to your email. To cancel, use the link
          in that invite or visit:
        </p>
        <p className="mt-2 break-all text-sm text-accent">
          <a
            href={confirmation.cancelUrl}
            className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {confirmation.cancelUrl}
          </a>
        </p>
      </section>
    </PublicBookingLayout>
  );
}
