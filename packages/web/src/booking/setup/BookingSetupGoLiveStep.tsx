import { type WeeklyAvailability } from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { formatBookingDestinationOptionLabel } from "@web/booking/booking-conference.copy";
import {
  rowsFromAvailability,
  summarizeHoursRows,
} from "@web/booking/weekly-hours.rows";

interface BookingSetupGoLiveStepProps {
  destinationCalendar: Calendar | undefined;
  durationMinutes: number;
  error: string | null;
  linkPreview: string | null;
  weeklyAvailability: WeeklyAvailability;
}

export function BookingSetupGoLiveStep({
  destinationCalendar,
  durationMinutes,
  error,
  linkPreview,
  weeklyAvailability,
}: BookingSetupGoLiveStepProps) {
  const hours = summarizeHoursRows(rowsFromAvailability(weeklyAvailability));

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-2 text-sm text-text">
        <div>
          <dt className="text-text-muted">Link</dt>
          <dd className="break-all">{linkPreview ?? "Your meeting page"}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Hours</dt>
          <dd>{hours || "No hours set"}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Duration</dt>
          <dd>{durationMinutes} minutes</dd>
        </div>
        {destinationCalendar ? (
          <div>
            <dt className="text-text-muted">Destination</dt>
            <dd>{formatBookingDestinationOptionLabel(destinationCalendar)}</dd>
          </div>
        ) : null}
      </dl>
      {error ? (
        <p className="font-medium text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
