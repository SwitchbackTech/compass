import { BOOKING_PLACEHOLDER_CALENDAR_ID } from "@core/types/booking.contracts";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type SyncConnectionSummary } from "@core/types/user.types";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
import {
  bookingDestinationConferenceHint,
  formatBookingDestinationOptionLabel,
} from "@web/booking/booking-conference.copy";
import { groupCalendarsByAccount } from "@web/calendars/calendar.util";

const BOOKING_SELECT_CLASS_NAME =
  "c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel";

interface BookingSetupDestinationStepProps {
  connections: SyncConnectionSummary[];
  onChange: (calendarId: CalendarId) => void;
  value: CalendarId;
  writableCalendars: Calendar[];
}

export function BookingSetupDestinationStep({
  connections,
  onChange,
  value,
  writableCalendars,
}: BookingSetupDestinationStepProps) {
  const { groups, ungrouped } = groupCalendarsByAccount(
    writableCalendars,
    connections,
  );
  const destinationCalendar = writableCalendars.find(
    (calendar) => calendar.id === value,
  );
  const hint = destinationCalendar
    ? bookingDestinationConferenceHint(destinationCalendar)
    : null;
  const hintId = "booking-setup-destination-hint";

  return (
    <div>
      <BookingFieldLabel htmlFor="booking-setup-destination">
        Destination calendar
      </BookingFieldLabel>
      <select
        aria-describedby={hint ? hintId : undefined}
        className={BOOKING_SELECT_CLASS_NAME}
        id="booking-setup-destination"
        onChange={(event) => onChange(event.target.value as CalendarId)}
        value={value}
      >
        {writableCalendars.length === 0 ? (
          <option value={BOOKING_PLACEHOLDER_CALENDAR_ID}>
            No writable calendars
          </option>
        ) : (
          <>
            {groups
              .filter((group) => group.calendars.length > 0)
              .map((group) => (
                <optgroup key={group.accountEmail} label={group.accountEmail}>
                  {group.calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {formatBookingDestinationOptionLabel(calendar)}
                    </option>
                  ))}
                </optgroup>
              ))}
            {ungrouped.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {formatBookingDestinationOptionLabel(calendar)}
              </option>
            ))}
          </>
        )}
      </select>
      {hint ? (
        <p className="mt-1 text-sm text-warning" id={hintId} role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
