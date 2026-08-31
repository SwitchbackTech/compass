import { type Ref, useEffect, useRef, useState } from "react";
import { PublicBookingMonthGrid } from "@web/booking/PublicBookingMonthGrid";
import { PublicBookingMonthGridSkeleton } from "@web/booking/PublicBookingMonthGridSkeleton";
import { PublicBookingSlotPaneSkeleton } from "@web/booking/PublicBookingSlotPaneSkeleton";
import { PublicBookingSlotPicker } from "@web/booking/PublicBookingSlotPicker";
import { PublicBookingSlotsLiveStatus } from "@web/booking/PublicBookingSlotsLiveStatus";
import { formatBookingMonthHeading } from "@web/booking/public-booking.format";

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
  onRetrySlots: () => void;
}

function useSlotsLiveMessage(pending: boolean, error: boolean): string {
  const [message, setMessage] = useState("");
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setMessage("Loading open times");
      return;
    }
    if (error) {
      wasPending.current = false;
      setMessage("Could not load times");
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      setMessage("Times loaded");
    }
  }, [error, pending]);

  return message;
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
  onRetrySlots,
}: PublicBookingPickerProps) {
  const [hasRenderedGrid, setHasRenderedGrid] = useState(false);
  const liveMessage = useSlotsLiveMessage(slotsPending, slotsError);
  const showGridSkeleton = slotsPending && !hasRenderedGrid;

  useEffect(() => {
    if (!slotsPending) {
      setHasRenderedGrid(true);
    }
  }, [slotsPending]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <PublicBookingSlotsLiveStatus message={liveMessage} />
      <div className="grid w-full min-w-0 gap-6 sm:grid-cols-2 sm:items-start">
        <div className="min-w-0">
          {showGridSkeleton ? (
            <PublicBookingMonthGridSkeleton
              monthHeading={formatBookingMonthHeading(monthKey, timeZone)}
            />
          ) : (
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
          )}
        </div>
        <div className="min-h-64 min-w-0 sm:max-h-96 sm:overflow-y-auto">
          {slotsPending ? (
            <PublicBookingSlotPaneSkeleton />
          ) : slotsError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-text-muted">Could not load times.</p>
              <button
                type="button"
                onClick={onRetrySlots}
                className="rounded-md bg-surface-panel px-3 py-2 font-medium text-sm text-text transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Retry
              </button>
            </div>
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
    </div>
  );
}
