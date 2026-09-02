import { CheckCircleIcon } from "@phosphor-icons/react";
import { PublicBookingCopyCancelUrl } from "@web/booking/PublicBookingCopyCancelUrl";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingSlotSummary } from "@web/booking/PublicBookingSlotSummary";
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
            className="font-semibold text-text text-xl focus:outline-none focus:ring-2 focus:ring-accent"
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
          {cancelUrl
            ? "A Google Meet invite is on its way to your email."
            : "A Google Meet invite is on its way to your email. To cancel, use the link in that invite."}
        </p>
        {cancelUrl ? (
          <PublicBookingCopyCancelUrl cancelUrl={cancelUrl} />
        ) : null}
      </section>
    </PublicBookingLayout>
  );
}
