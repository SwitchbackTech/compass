import { type BookingSlot } from "@core/types/booking.contracts";
import {
  formatBookingSlotDateHeading,
  formatBookingSlotTime,
  formatGuestTimeZoneLabel,
  groupSlotsByGuestDate,
} from "@web/booking/public-booking.format";

interface PublicBookingSlotPickerProps {
  slots: readonly BookingSlot[];
  guestTimeZone: string;
  selectedSlotStart: string | null;
  onSelectSlot: (slotStart: string) => void;
}

export function PublicBookingSlotPicker({
  slots,
  guestTimeZone,
  selectedSlotStart,
  onSelectSlot,
}: PublicBookingSlotPickerProps) {
  const grouped = groupSlotsByGuestDate(slots, guestTimeZone);
  const dateKeys = [...grouped.keys()];

  if (dateKeys.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No open times this month. Try another month or check back later.
      </p>
    );
  }

  return (
    <section aria-labelledby="booking-slots-heading">
      <div className="flex flex-col gap-1">
        <h2
          id="booking-slots-heading"
          className="font-medium text-base text-text"
        >
          Pick a time
        </h2>
        <p className="text-sm text-text-muted">
          Times shown in your timezone (
          {formatGuestTimeZoneLabel(guestTimeZone)}).
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-5">
        {dateKeys.map((dateKey) => {
          const daySlots = grouped.get(dateKey) ?? [];
          const heading = formatBookingSlotDateHeading(
            daySlots[0]?.slotStart ?? dateKey,
            guestTimeZone,
          );
          return (
            <div key={dateKey} className="flex flex-col gap-2">
              <h3 className="font-medium text-sm text-text-muted">{heading}</h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {daySlots.map((slot) => {
                  const isSelected = selectedSlotStart === slot.slotStart;
                  const label = formatBookingSlotTime(
                    slot.slotStart,
                    guestTimeZone,
                  );
                  return (
                    <li key={slot.slotStart}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectSlot(slot.slotStart)}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:border-accent hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-pressed:border-accent aria-pressed:bg-surface-panel"
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
