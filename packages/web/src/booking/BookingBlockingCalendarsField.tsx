import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type SyncConnectionSummary } from "@core/types/user.types";
import { BookingCheckboxRow } from "@web/booking/BookingCheckboxRow";
import {
  bookingFieldAttrs,
  bookingJumpKeys,
} from "@web/booking/booking-sequence.fields";
import { groupCalendarsByAccount } from "@web/calendars/calendar.util";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

interface BookingBlockingCalendarsFieldProps {
  availabilityCalendars: Calendar[];
  blockingCalendarIds: readonly CalendarId[];
  connections: SyncConnectionSummary[];
  onToggle: (calendarId: CalendarId, checked: boolean) => void;
  showShortcuts: boolean;
}

export function BookingBlockingCalendarsField({
  availabilityCalendars,
  blockingCalendarIds,
  connections,
  onToggle,
  showShortcuts,
}: BookingBlockingCalendarsFieldProps) {
  const blockingSet = new Set(blockingCalendarIds);
  const { groups, ungrouped } = groupCalendarsByAccount(
    availabilityCalendars,
    connections,
  );

  const renderBlockingCalendar = (calendar: Calendar) => (
    <BookingCheckboxRow
      checked={blockingSet.has(calendar.id)}
      key={calendar.id}
      onChange={(checked) => onToggle(calendar.id, checked)}
    >
      {calendar.name}
    </BookingCheckboxRow>
  );

  return (
    <fieldset
      className="flex flex-col gap-2"
      {...bookingFieldAttrs("blocking")}
    >
      <legend className="mb-1 flex items-center gap-1 text-sm text-text">
        Blocking calendars
        {showShortcuts ? (
          <ShortcutKeys keys={bookingJumpKeys("blocking")} />
        ) : null}
      </legend>
      {availabilityCalendars.length === 0 ? (
        <p className="text-sm text-text-muted">No calendars available.</p>
      ) : (
        <>
          {groups
            .filter((group) => group.calendars.length > 0)
            .map((group) => (
              <div className="flex flex-col gap-1" key={group.accountEmail}>
                <p className="text-text-muted text-xs">{group.accountEmail}</p>
                {group.calendars.map(renderBlockingCalendar)}
              </div>
            ))}
          {ungrouped.map(renderBlockingCalendar)}
        </>
      )}
      <p className="text-text-muted text-xs">
        Pending, maybe, and declined invites do not hold booking times. Accepted
        invites and events the host organizes do.
      </p>
    </fieldset>
  );
}
