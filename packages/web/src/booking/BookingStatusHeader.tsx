import { BookingCopyLink } from "@web/booking/BookingCopyLink";
import {
  bookingFieldAttrs,
  bookingJumpKeys,
} from "@web/booking/booking-sequence.fields";
import { Switch } from "@web/components/Switch/Switch";

interface BookingStatusHeaderProps {
  isLive: boolean;
  isPending: boolean;
  onToggle: (next: boolean) => void;
  bookingUrl: string | null;
  addressPreview: string | null;
  showShortcuts?: boolean;
}

export function BookingStatusHeader({
  isLive,
  isPending,
  onToggle,
  bookingUrl,
  addressPreview,
  showShortcuts = false,
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
        shortcutKeys={showShortcuts ? bookingJumpKeys("enabled") : undefined}
      />
      {isLive ? (
        <>
          <p className="text-sm text-text">Live at</p>
          {bookingUrl ? (
            <BookingCopyLink
              bookingUrl={bookingUrl}
              showShortcuts={showShortcuts}
            />
          ) : null}
        </>
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
