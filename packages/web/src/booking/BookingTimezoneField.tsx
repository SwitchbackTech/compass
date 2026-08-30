import { useMemo } from "react";
import { type TimeZone } from "@core/types/domain-primitives";
import { buildTimeZoneList } from "@web/timezone/timezone-catalog";

interface BookingTimezoneFieldProps {
  timeZone: TimeZone;
  onChange: (timeZone: TimeZone) => void;
  disabled?: boolean;
}

export function BookingTimezoneField({
  timeZone,
  onChange,
  disabled = false,
}: BookingTimezoneFieldProps) {
  const zones = useMemo(() => buildTimeZoneList(), []);

  return (
    <div>
      <label
        className="mb-1 block text-sm text-text"
        htmlFor="booking-timezone"
      >
        Booking timezone
      </label>
      <select
        className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel disabled:pointer-events-none disabled:opacity-60"
        disabled={disabled}
        id="booking-timezone"
        onChange={(event) => onChange(event.target.value as TimeZone)}
        value={timeZone}
      >
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.city} ({zone.abbreviation})
          </option>
        ))}
      </select>
    </div>
  );
}
