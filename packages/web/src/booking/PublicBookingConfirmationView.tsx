import { CheckCircleIcon } from "@phosphor-icons/react";
import { PublicBookingCopyCancelUrl } from "@web/booking/PublicBookingCopyCancelUrl";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingSlotSummary } from "@web/booking/PublicBookingSlotSummary";
import { PUBLIC_BOOKING_HEADING_CLASS } from "@web/booking/PublicBookingStatusMessage";
import { useBookingHeadingFocus } from "@web/booking/use-booking-heading-focus";

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
  const headingRef = useBookingHeadingFocus(hostDisplayName);

  return (
    <PublicBookingLayout>
      <section
        aria-labelledby="booking-confirmation-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <CheckCircleIcon
            aria-hidden
            className="mt-0.5 shrink-0 text-success"
            size={28}
            weight="fill"
          />
          <h1
            ref={headingRef}
            id="booking-confirmation-heading"
            tabIndex={-1}
            className={PUBLIC_BOOKING_HEADING_CLASS}
          >
            You are booked with {hostDisplayName}
          </h1>
        </div>
        <PublicBookingSlotSummary
          durationMinutes={durationMinutes}
          slotStart={slotStart}
          timeZone={timeZone}
        />
        <p className="text-sm text-text">
          {`A Google Meet invite is on its way to your email.${
            cancelUrl ? "" : " To cancel, use the link in that invite."
          }`}
        </p>
        {cancelUrl ? (
          <PublicBookingCopyCancelUrl cancelUrl={cancelUrl} />
        ) : null}
      </section>
    </PublicBookingLayout>
  );
}
