import {
  type BookingDurationMinutes,
  type WeeklyAvailability,
} from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { bookingAddressPrefix } from "@web/booking/BookingAddressField";
import { formatBookingDestinationOptionLabel } from "@web/booking/booking-conference.copy";
import {
  rowsFromAvailability,
  summarizeHoursRows,
} from "@web/booking/weekly-hours.rows";

interface BookingSetupGoLiveStepProps {
  bookingUrl: string | null;
  destinationCalendar: Calendar | undefined;
  durationMinutes: BookingDurationMinutes;
  slug: string;
  weeklyAvailability: WeeklyAvailability;
}

export function BookingSetupGoLiveStep({
  bookingUrl,
  destinationCalendar,
  durationMinutes,
  slug,
  weeklyAvailability,
}: BookingSetupGoLiveStepProps) {
  const prefix = bookingAddressPrefix(bookingUrl);
  const hoursSummary = summarizeHoursRows(
    rowsFromAvailability(weeklyAvailability),
  );
  const destinationLabel = destinationCalendar
    ? formatBookingDestinationOptionLabel(destinationCalendar)
    : "No writable calendars";

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm text-text">
      <dt className="text-text-muted">Link</dt>
      <dd className="break-all">
        {prefix}
        {slug}
      </dd>
      <dt className="text-text-muted">Hours</dt>
      <dd>{hoursSummary}</dd>
      <dt className="text-text-muted">Duration</dt>
      <dd>{durationMinutes} minutes</dd>
      <dt className="text-text-muted">Destination</dt>
      <dd>{destinationLabel}</dd>
    </dl>
  );
}
