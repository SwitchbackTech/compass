import { BookingCopyLink } from "@web/booking/BookingCopyLink";

interface BookingStatusHeaderProps {
  isLive: boolean;
  bookingUrl: string | null;
  addressPreview: string | null;
  showShortcuts?: boolean;
}

export function BookingStatusHeader({
  isLive,
  bookingUrl,
  addressPreview,
  showShortcuts = false,
}: BookingStatusHeaderProps) {
  if (isLive) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-medium text-sm text-text">
          Your meeting page is live
        </p>
        {bookingUrl ? (
          <BookingCopyLink
            bookingUrl={bookingUrl}
            showShortcuts={showShortcuts}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium text-sm text-text">
        Your meeting page is not live yet
      </p>
      {addressPreview ? (
        <p className="text-sm text-text-muted">
          It will be at {addressPreview}
        </p>
      ) : null}
    </div>
  );
}
