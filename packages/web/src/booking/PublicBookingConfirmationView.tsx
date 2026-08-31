import { type Ref } from "react";
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
  headingRef?: Ref<HTMLHeadingElement>;
}

export function PublicBookingConfirmationView({
  hostDisplayName,
  durationMinutes,
  slotStart,
  timeZone,
  cancelUrl,
  headingRef,
}: PublicBookingConfirmationViewProps) {
  const when = formatBookingSlotLabel(slotStart, timeZone);

  return (
    <PublicBookingLayout>
      <section aria-labelledby="booking-confirmation-heading">
        <h1
          ref={headingRef}
          id="booking-confirmation-heading"
          tabIndex={-1}
          className="font-semibold text-text text-xl focus:outline-none focus:ring-2 focus:ring-accent"
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
