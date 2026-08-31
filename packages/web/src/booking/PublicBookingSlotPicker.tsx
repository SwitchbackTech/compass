import {
  formatBookingSlotDateHeading,
  formatBookingSlotDateKey,
  formatBookingSlotTime,
} from "@web/booking/public-booking.format";

interface PublicBookingSlotPickerProps {
  slots: readonly { slotStart: string }[];
  selectedDateKey: string | null;
  guestTimeZone: string;
  selectedSlotStart: string | null;
  onSelectSlot: (slotStart: string) => void;
  onJumpToNextAvailable?: () => void;
}

export function PublicBookingSlotPicker({
  slots,
  selectedDateKey,
  guestTimeZone,
  selectedSlotStart,
  onSelectSlot,
  onJumpToNextAvailable,
}: PublicBookingSlotPickerProps) {
  const daySlots = selectedDateKey
    ? slots.filter(
        (slot) =>
          formatBookingSlotDateKey(slot.slotStart, guestTimeZone) ===
          selectedDateKey,
      )
    : [];

  if (!selectedDateKey || daySlots.length === 0) {
    return (
      <section aria-labelledby="booking-slots-heading">
        <h2
          id="booking-slots-heading"
          className="font-medium text-base text-text"
        >
          Pick a time
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {selectedDateKey
            ? "No open times on this day."
            : "No open times this month."}
        </p>
        {onJumpToNextAvailable ? (
          <button
            type="button"
            onClick={onJumpToNextAvailable}
            className="mt-3 rounded-md bg-surface-panel px-3 py-2 font-medium text-sm text-text transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Jump to next available day
          </button>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            Try another month or check back later.
          </p>
        )}
      </section>
    );
  }

  const heading = formatBookingSlotDateHeading(
    daySlots[0]?.slotStart ?? selectedDateKey,
    guestTimeZone,
  );

  return (
    <section aria-labelledby="booking-slots-heading">
      <h2
        id="booking-slots-heading"
        className="font-medium text-base text-text"
      >
        Pick a time
      </h2>
      <h3 className="mt-1 font-medium text-sm text-text-muted">{heading}</h3>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {daySlots.map((slot) => {
          const isSelected = selectedSlotStart === slot.slotStart;
          const label = formatBookingSlotTime(slot.slotStart, guestTimeZone);
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
    </section>
  );
}
