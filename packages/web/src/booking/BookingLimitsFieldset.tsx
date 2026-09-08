import { type AdminPutBookingPageInput } from "@core/types/booking.contracts";
import { BookingCheckboxRow } from "@web/booking/BookingCheckboxRow";
import { bookingFieldAttrs } from "@web/booking/booking-sequence.fields";

const DEFAULT_BUFFER_MINUTES = 30;
const DEFAULT_MAX_BOOKINGS_PER_DAY = 4;

interface BookingLimitsFieldsetProps {
  bufferMinutes: AdminPutBookingPageInput["bufferMinutes"];
  guestsCanInviteOthers: boolean;
  maxBookingsPerDay: AdminPutBookingPageInput["maxBookingsPerDay"];
  onChange: (patch: Partial<AdminPutBookingPageInput>) => void;
}

export function BookingLimitsFieldset({
  bufferMinutes,
  guestsCanInviteOthers,
  maxBookingsPerDay,
  onChange,
}: BookingLimitsFieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-2" {...bookingFieldAttrs("options")}>
      <legend className="mb-1 text-sm text-text">Buffer and limits</legend>

      <BookingCheckboxRow
        checked={bufferMinutes !== null}
        onChange={(checked) =>
          onChange({
            bufferMinutes: checked ? DEFAULT_BUFFER_MINUTES : null,
          })
        }
      >
        Buffer between appointments ({DEFAULT_BUFFER_MINUTES} minutes)
      </BookingCheckboxRow>

      <BookingCheckboxRow
        checked={maxBookingsPerDay !== null}
        onChange={(checked) =>
          onChange({
            maxBookingsPerDay: checked ? DEFAULT_MAX_BOOKINGS_PER_DAY : null,
          })
        }
      >
        Max meetings per day ({DEFAULT_MAX_BOOKINGS_PER_DAY})
      </BookingCheckboxRow>

      <BookingCheckboxRow
        checked={guestsCanInviteOthers}
        onChange={(nextGuestsCanInviteOthers) =>
          onChange({ guestsCanInviteOthers: nextGuestsCanInviteOthers })
        }
      >
        Guest can invite others
      </BookingCheckboxRow>
      <p className="text-text-muted text-xs">
        When this is on, Compass cannot put the cancel link in the calendar
        description. Guests keep it from the confirmation page.
      </p>
    </fieldset>
  );
}
