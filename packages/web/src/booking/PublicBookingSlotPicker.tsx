import { type Ref } from "react";
import {
  formatBookingDateKey,
  formatBookingSlotDateHeading,
  formatBookingSlotTime,
} from "@web/booking/public-booking.format";

interface PublicBookingSlotPickerProps {
  slots: readonly { slotStart: string }[];
  selectedDateKey: string | null;
  guestTimeZone: string;
  selectedSlotStart: string | null;
  headingRef?: Ref<HTMLHeadingElement>;
  onSelectSlot: (slotStart: string) => void;
  onJumpToNextAvailable?: () => void;
}

export function PublicBookingSlotPicker({
  slots,
  selectedDateKey,
  guestTimeZone,
  selectedSlotStart,
  headingRef,
  onSelectSlot,
  onJumpToNextAvailable,
}: PublicBookingSlotPickerProps) {
  const daySlots = selectedDateKey
    ? slots.filter(
        (slot) =>
          formatBookingDateKey(slot.slotStart, guestTimeZone) ===
          selectedDateKey,
      )
    : [];

  const empty = !selectedDateKey || daySlots.length === 0;
  const firstSlotStart = daySlots[0]?.slotStart;

  return (
    <section aria-labelledby="booking-slots-heading">
      <h2
        ref={headingRef}
        id="booking-slots-heading"
        tabIndex={-1}
        className="font-medium text-base text-text focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Pick a time
      </h2>
      {empty || !firstSlotStart ? (
        <>
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
        </>
      ) : (
        <>
          <h3 className="mt-1 font-medium text-sm text-text-muted">
            {formatBookingSlotDateHeading(firstSlotStart, guestTimeZone)}
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-2">
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
        </>
      )}
    </section>
  );
}
