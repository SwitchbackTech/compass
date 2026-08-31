import { PublicBookingCopyCancelUrl } from "@web/booking/PublicBookingCopyCancelUrl";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import {
  formatBookingSlotLabel,
  formatDurationMinutes,
} from "@web/booking/public-booking.format";

interface PublicBookingConfirmationViewProps {
  hostDisplayName: string;
  durationMinutes: number;
  slotStart: string;
  timeZone: string;
  cancelUrl?: string;
}

export function PublicBookingConfirmationView({
  hostDisplayName,
  durationMinutes,
  slotStart,
  timeZone,
  cancelUrl,
}: PublicBookingConfirmationViewProps) {
  const when = formatBookingSlotLabel(slotStart, timeZone);

  return (
    <PublicBookingLayout>
      <section aria-labelledby="booking-confirmation-heading">
        <h1
          id="booking-confirmation-heading"
          className="font-semibold text-text text-xl"
        >
          You are booked with {hostDisplayName}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {when} ({formatDurationMinutes(durationMinutes)})
        </p>
        <p className="mt-4 text-sm text-text">
          A calendar invite is on its way to your email. To cancel, use the link
          in that invite
          {cancelUrl ? " or copy it here:" : "."}
        </p>
        {cancelUrl ? (
          <PublicBookingCopyCancelUrl cancelUrl={cancelUrl} />
        ) : null}
      </section>
    </PublicBookingLayout>
  );
}
