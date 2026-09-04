import { PublicBookingCopyGuestAction } from "@web/booking/PublicBookingCopyGuestAction";

interface PublicBookingCopyCancelUrlProps {
  cancelUrl: string;
}

export function PublicBookingCopyCancelUrl({
  cancelUrl,
}: PublicBookingCopyCancelUrlProps) {
  return (
    <PublicBookingCopyGuestAction
      copyLabel="Copy cancel link"
      linkLabel="Cancel this booking"
      url={cancelUrl}
    />
  );
}
