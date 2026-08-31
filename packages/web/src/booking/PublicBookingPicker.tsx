import { type Ref } from "react";
import { PublicBookingMonthGrid } from "@web/booking/PublicBookingMonthGrid";
import { PublicBookingSlotPicker } from "@web/booking/PublicBookingSlotPicker";

interface PublicBookingPickerProps {
  monthKey: string;
  timeZone: string;
  maxHorizonDays: number;
  slots: readonly { slotStart: string }[];
  slotsPending: boolean;
  slotsError: boolean;
  selectedDateKey: string | null;
  selectedSlotStart: string | null;
  slotsHeadingRef?: Ref<HTMLHeadingElement>;
  onMonthChange: (monthKey: string) => void;
  onPrefetchMonth: (monthKey: string) => void;
  onSelectDate: (dateKey: string) => void;
  onSelectSlot: (slotStart: string) => void;
  onJumpToNextAvailable: () => void;
}

export function PublicBookingPicker({
  monthKey,
  timeZone,
  maxHorizonDays,
  slots,
  slotsPending,
  slotsError,
  selectedDateKey,
  selectedSlotStart,
  slotsHeadingRef,
  onMonthChange,
  onPrefetchMonth,
  onSelectDate,
  onSelectSlot,
  onJumpToNextAvailable,
}: PublicBookingPickerProps) {
  return (
    <div className="grid w-full min-w-0 gap-6 sm:grid-cols-2 sm:items-start">
      <div className="min-w-0">
        <PublicBookingMonthGrid
          monthKey={monthKey}
          timeZone={timeZone}
          maxHorizonDays={maxHorizonDays}
          slots={slots}
          selectedDateKey={selectedDateKey}
          onMonthChange={onMonthChange}
          onPrefetchMonth={onPrefetchMonth}
          onSelectDate={onSelectDate}
        />
      </div>
      <div className="min-h-64 min-w-0 sm:max-h-96 sm:overflow-y-auto">
        {slotsPending ? (
          <p className="text-sm text-text-muted">Loading open times...</p>
        ) : slotsError ? (
          <p className="text-sm text-text-muted">
            Could not load times. Please refresh and try again.
          </p>
        ) : (
          <PublicBookingSlotPicker
            slots={slots}
            selectedDateKey={selectedDateKey}
            guestTimeZone={timeZone}
            selectedSlotStart={selectedSlotStart}
            headingRef={slotsHeadingRef}
            onSelectSlot={onSelectSlot}
            onJumpToNextAvailable={onJumpToNextAvailable}
          />
        )}
      </div>
    </div>
  );
}
