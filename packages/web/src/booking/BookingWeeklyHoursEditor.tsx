import {
  type WeeklyAvailability,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import { ISO_WEEKDAYS, weekdayLabel } from "@web/booking/booking.util";

interface BookingWeeklyHoursEditorProps {
  value: WeeklyAvailability;
  onChange: (value: WeeklyAvailability) => void;
  disabled?: boolean;
}

type WeekdayRow = {
  weekday: WeeklyAvailabilityInterval["weekday"];
  enabled: boolean;
  start: string;
  end: string;
};

const defaultRowTimes = (): Pick<WeekdayRow, "start" | "end"> => ({
  start: "09:00",
  end: "17:00",
});

const rowsFromAvailability = (value: WeeklyAvailability): WeekdayRow[] =>
  ISO_WEEKDAYS.map((weekday) => {
    const interval = value.find((entry) => entry.weekday === weekday);
    return {
      weekday,
      enabled: interval !== undefined,
      start: interval?.start ?? defaultRowTimes().start,
      end: interval?.end ?? defaultRowTimes().end,
    };
  });

const availabilityFromRows = (rows: WeekdayRow[]): WeeklyAvailability =>
  rows
    .filter((row) => row.enabled)
    .map((row) => ({
      weekday: row.weekday,
      start: row.start,
      end: row.end,
    }));

export function BookingWeeklyHoursEditor({
  value,
  onChange,
  disabled = false,
}: BookingWeeklyHoursEditorProps) {
  const rows = rowsFromAvailability(value);

  const updateRows = (nextRows: WeekdayRow[]) => {
    onChange(availabilityFromRows(nextRows));
  };

  const updateRow = (
    weekday: WeeklyAvailabilityInterval["weekday"],
    patch: Partial<WeekdayRow>,
  ) => {
    updateRows(
      rows.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)),
    );
  };

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-sm text-text">Weekly hours</legend>
      {rows.map((row) => (
        <div className="flex flex-wrap items-center gap-2" key={row.weekday}>
          <label className="flex w-28 shrink-0 items-center gap-2 text-sm text-text">
            <input
              checked={row.enabled}
              className="c-all-day-checkbox"
              onChange={(event) =>
                updateRow(row.weekday, { enabled: event.target.checked })
              }
              type="checkbox"
            />
            {weekdayLabel(row.weekday)}
          </label>
          {row.enabled ? (
            <>
              <label
                className="sr-only"
                htmlFor={`booking-start-${row.weekday}`}
              >
                {weekdayLabel(row.weekday)} start
              </label>
              <input
                className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
                id={`booking-start-${row.weekday}`}
                onChange={(event) =>
                  updateRow(row.weekday, { start: event.target.value })
                }
                type="time"
                value={row.start}
              />
              <span className="text-sm text-text-muted">to</span>
              <label className="sr-only" htmlFor={`booking-end-${row.weekday}`}>
                {weekdayLabel(row.weekday)} end
              </label>
              <input
                className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
                id={`booking-end-${row.weekday}`}
                onChange={(event) =>
                  updateRow(row.weekday, { end: event.target.value })
                }
                type="time"
                value={row.end}
              />
            </>
          ) : (
            <span className="text-sm text-text-muted">Unavailable</span>
          )}
        </div>
      ))}
    </fieldset>
  );
}
