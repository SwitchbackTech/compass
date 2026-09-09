import { useCallback } from "react";
import { type WeeklyAvailability } from "@core/types/booking.contracts";
import { type TimeZone } from "@core/types/domain-primitives";
import { BookingWeeklyHoursEditor } from "@web/booking/BookingWeeklyHoursEditor";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { timeZoneCityName } from "@web/timezone/timezone-catalog";

interface BookingSetupHoursStepProps {
  onChange: (weeklyAvailability: WeeklyAvailability) => void;
  timeZone: TimeZone;
  value: WeeklyAvailability;
}

export function formatBookingSetupTimezoneLabel(timeZone: TimeZone): string {
  return `${timeZoneCityName(timeZone)} (${formatTimeZoneAbbreviation(timeZone)})`;
}

export function BookingSetupHoursStep({
  onChange,
  timeZone,
  value,
}: BookingSetupHoursStepProps) {
  const rootRef = useCallback((node: HTMLDivElement | null) => {
    node?.querySelector<HTMLElement>("button, select")?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
      <BookingWeeklyHoursEditor onChange={onChange} value={value} />
      <p className="text-sm text-text-muted">
        Times are in {formatBookingSetupTimezoneLabel(timeZone)}. You can change
        this later.
      </p>
    </div>
  );
}
