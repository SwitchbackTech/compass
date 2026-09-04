import { PublicBookingCopyGuestAction } from "@web/booking/PublicBookingCopyGuestAction";

interface PublicBookingCopyRescheduleUrlProps {
  rescheduleUrl: string;
}

export function PublicBookingCopyRescheduleUrl({
  rescheduleUrl,
}: PublicBookingCopyRescheduleUrlProps) {
  return (
    <PublicBookingCopyGuestAction
      copyLabel="Copy reschedule link"
      linkLabel="Reschedule this booking"
      url={rescheduleUrl}
    />
  );
}
