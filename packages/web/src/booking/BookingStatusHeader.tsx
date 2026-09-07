import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { bookingFieldAttrs } from "@web/booking/booking-sequence.fields";

interface BookingStatusHeaderProps {
  isLive: boolean;
  bookingUrl: string | null;
  addressPreview: string | null;
}

export function BookingStatusHeader({
  isLive,
  bookingUrl,
  addressPreview,
}: BookingStatusHeaderProps) {
  if (isLive) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text">
          Your booking page is live
        </p>
        {bookingUrl ? (
          <div {...bookingFieldAttrs("link")}>
            <BookingCopyLink bookingUrl={bookingUrl} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-text">
        Your booking page is not live yet
      </p>
      {addressPreview ? (
        <p className="text-sm text-text-muted">
          It will be at {addressPreview}
        </p>
      ) : null}
    </div>
  );
}
