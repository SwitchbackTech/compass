import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import { bookingFieldAttrs } from "@web/booking/booking-sequence.fields";
import { Switch } from "@web/components/Switch/Switch";

interface BookingStatusHeaderProps {
  isLive: boolean;
  isPending: boolean;
  onToggle: (next: boolean) => void;
  bookingUrl: string | null;
  addressPreview: string | null;
}

export function BookingStatusHeader({
  isLive,
  isPending,
  onToggle,
  bookingUrl,
  addressPreview,
}: BookingStatusHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Switch
        {...bookingFieldAttrs("enabled")}
        busy={isPending}
        checked={isLive}
        id="booking-meeting-page"
        label="Meeting page"
        onCheckedChange={onToggle}
      />
      {isLive ? (
        bookingUrl ? (
          <BookingCopyLink bookingUrl={bookingUrl} />
        ) : null
      ) : (
        <>
          <p className="text-sm text-text">
            Off. Turn it on to share your link.
          </p>
          {addressPreview ? (
            <p className="text-sm text-text-muted">
              It will be at {addressPreview}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
