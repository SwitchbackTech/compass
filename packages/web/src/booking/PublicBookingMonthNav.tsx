import {
  formatBookingMonthHeading,
  isBookingMonthAvailable,
  shiftBookingMonthKey,
} from "@web/booking/public-booking.format";

interface PublicBookingMonthNavProps {
  monthKey: string;
  timeZone: string;
  maxHorizonDays: number;
  onMonthChange: (monthKey: string) => void;
  onPrefetchMonth: (monthKey: string) => void;
}

export function PublicBookingMonthNav({
  monthKey,
  timeZone,
  maxHorizonDays,
  onMonthChange,
  onPrefetchMonth,
}: PublicBookingMonthNavProps) {
  const previousMonthKey = shiftBookingMonthKey(monthKey, -1, timeZone);
  const nextMonthKey = shiftBookingMonthKey(monthKey, 1, timeZone);
  const canGoPrevious = isBookingMonthAvailable(
    previousMonthKey,
    timeZone,
    maxHorizonDays,
  );
  const canGoNext = isBookingMonthAvailable(
    nextMonthKey,
    timeZone,
    maxHorizonDays,
  );

  return (
    <nav
      aria-labelledby="booking-month-heading"
      className="flex items-center justify-between gap-2"
    >
      <button
        type="button"
        aria-label="Previous month"
        disabled={!canGoPrevious}
        onClick={() => onMonthChange(previousMonthKey)}
        onMouseEnter={() => {
          if (canGoPrevious) {
            onPrefetchMonth(previousMonthKey);
          }
        }}
        onFocus={() => {
          if (canGoPrevious) {
            onPrefetchMonth(previousMonthKey);
          }
        }}
        className="rounded-md px-3 py-2 font-medium text-sm text-text transition-colors hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <h2
        id="booking-month-heading"
        className="font-medium text-base text-text"
      >
        {formatBookingMonthHeading(monthKey, timeZone)}
      </h2>
      <button
        type="button"
        aria-label="Next month"
        disabled={!canGoNext}
        onClick={() => onMonthChange(nextMonthKey)}
        onMouseEnter={() => {
          if (canGoNext) {
            onPrefetchMonth(nextMonthKey);
          }
        }}
        onFocus={() => {
          if (canGoNext) {
            onPrefetchMonth(nextMonthKey);
          }
        }}
        className="rounded-md px-3 py-2 font-medium text-sm text-text transition-colors hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
