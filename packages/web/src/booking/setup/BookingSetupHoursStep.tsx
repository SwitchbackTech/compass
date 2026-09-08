import { type WeeklyAvailability } from "@core/types/booking.contracts";
import { type TimeZone } from "@core/types/domain-primitives";
import { bookingTimezoneLabel } from "@web/booking/BookingTimezoneField";
import { BookingWeeklyHoursEditor } from "@web/booking/BookingWeeklyHoursEditor";

interface BookingSetupHoursStepProps {
  onChange: (weeklyAvailability: WeeklyAvailability) => void;
  timeZone: TimeZone;
  value: WeeklyAvailability;
}

export function BookingSetupHoursStep({
  onChange,
  timeZone,
  value,
}: BookingSetupHoursStepProps) {
  return (
    <div className="flex flex-col gap-2">
      <BookingWeeklyHoursEditor onChange={onChange} value={value} />
      <p className="text-text-muted text-xs">
        Times are in {bookingTimezoneLabel(timeZone)}. You can change this
        later.
      </p>
    </div>
  );
}
