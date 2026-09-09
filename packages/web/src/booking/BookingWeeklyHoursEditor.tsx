import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  type LocalTimeOfDay,
  type WeeklyAvailability,
} from "@core/types/booking.contracts";
import {
  ISO_WEEKDAYS,
  type IsoWeekday,
  weekdayLabel,
  weekdayShortLabel,
} from "@web/booking/booking.util";
import {
  availabilityFromRows,
  claimWeekday,
  DEFAULT_HOURS_ROW,
  endOptionsAfter,
  formatTimeLabel,
  type HoursRow,
  hoursSelectLabel,
  rowsFromAvailability,
  snapEndAfterStart,
  summarizeHoursRows,
  TIME_OPTIONS,
  unassignedWeekdays,
} from "@web/booking/weekly-hours.rows";

interface BookingWeeklyHoursEditorProps {
  value: WeeklyAvailability;
  onChange: (value: WeeklyAvailability) => void;
  disabled?: boolean;
}

interface EditorRow extends HoursRow {
  id: number;
}

const BOOKING_SELECT_CLASS_NAME =
  "c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel";

const emptyEditorRow = (): HoursRow => ({
  weekdays: new Set<IsoWeekday>(),
  start: DEFAULT_HOURS_ROW.start,
  end: DEFAULT_HOURS_ROW.end,
});

const toEditorRows = (
  value: WeeklyAvailability,
  nextId: () => number,
): EditorRow[] => {
  const grouped = rowsFromAvailability(value);
  const source = grouped.length > 0 ? grouped : [emptyEditorRow()];
  return source.map((row) => ({ ...row, id: nextId() }));
};

const pillClassName =
  "c-focus-ring min-h-8 min-w-8 rounded border border-border px-1.5 text-xs text-text hover:bg-surface-panel aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent";

/**
 * Grouped day-pill rows: one Start and End menu shared by the days in that row.
 */
export function BookingWeeklyHoursEditor({
  value,
  onChange,
  disabled = false,
}: BookingWeeklyHoursEditorProps) {
  const idRef = useRef(1);
  const allocId = () => {
    const id = idRef.current;
    idRef.current += 1;
    return id;
  };
  const [rows, setRows] = useState<EditorRow[]>(() =>
    toEditorRows(value, allocId),
  );
  const [announcement, setAnnouncement] = useState("");
  const [rover, setRover] = useState<Record<number, IsoWeekday>>({});
  const emittedRef = useRef<WeeklyAvailability>(value);

  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    setRows(
      toEditorRows(value, () => {
        const id = idRef.current;
        idRef.current += 1;
        return id;
      }),
    );
  }, [value]);

  const commitRows = (nextRows: EditorRow[], liveAnnouncement?: string) => {
    const nextValue = availabilityFromRows(nextRows);
    setRows(nextRows);
    emittedRef.current = nextValue;
    onChange(nextValue);
    if (liveAnnouncement) setAnnouncement(liveAnnouncement);
  };

  const setRowStart = (id: number, start: LocalTimeOfDay) => {
    commitRows(
      rows.map((row) =>
        row.id === id
          ? { ...row, start, end: snapEndAfterStart(start, row.end) }
          : row,
      ),
    );
  };

  const setRowEnd = (id: number, end: LocalTimeOfDay) => {
    commitRows(rows.map((row) => (row.id === id ? { ...row, end } : row)));
  };

  const toggleDay = (rowIndex: number, weekday: IsoWeekday) => {
    const wasPressed = rows[rowIndex]?.weekdays.has(weekday) === true;
    const next = claimWeekday(rows, rowIndex, weekday);
    commitRows(
      next,
      wasPressed
        ? `Removed ${weekdayLabel(weekday)}`
        : `Added ${weekdayLabel(weekday)}`,
    );
  };

  const addRow = () => {
    const seeded = new Set(unassignedWeekdays(rows));
    if (seeded.size === 0) return;
    const next: EditorRow[] = [
      ...rows,
      {
        id: allocId(),
        weekdays: seeded,
        start: DEFAULT_HOURS_ROW.start,
        end: DEFAULT_HOURS_ROW.end,
      },
    ];
    commitRows(next, "Added hours row");
  };

  const removeRow = (id: number) => {
    if (rows.length < 2) return;
    commitRows(
      rows.filter((row) => row.id !== id),
      "Removed hours row",
    );
  };

  const unavailable = unassignedWeekdays(rows);
  const unavailableCopy =
    unavailable.length > 0
      ? `Unavailable: ${unavailable.map(weekdayLabel).join(", ")}`
      : null;
  const everyDayHasHours = unavailable.length === 0;
  const hoursSummary = summarizeHoursRows(rows);
  const hoursFieldDescriptionIds = [
    unavailableCopy ? "booking-hours-unavailable" : null,
    hoursSummary ? "booking-hours-summary" : null,
  ]
    .filter((id): id is string => id != null)
    .join(" ");

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-sm text-text">Weekly hours</legend>
      {unavailableCopy ? (
        <p className="text-sm text-text-muted" id="booking-hours-unavailable">
          {unavailableCopy}
        </p>
      ) : null}

      <span aria-live="polite" className="sr-only" role="status">
        {announcement}
      </span>
      {hoursSummary ? (
        <p className="sr-only" id="booking-hours-summary">
          {hoursSummary}
        </p>
      ) : null}

      {rows.map((row, rowIndex) => {
        const tabStop = roverDay(row, rover[row.id]);
        const endChoices = endOptionsForRow(row);
        return (
          <div className="flex flex-col gap-1" key={row.id}>
            <div className="flex flex-wrap items-center gap-2">
              <fieldset
                className="flex flex-wrap gap-1"
                onKeyDown={(event) =>
                  handleDayGroupKeyDown(event, tabStop, (weekday) => {
                    setRover((current) => ({ ...current, [row.id]: weekday }));
                    const pill = event.currentTarget.querySelector<HTMLElement>(
                      `[aria-label="${weekdayLabel(weekday)}"]`,
                    );
                    pill?.focus();
                  })
                }
              >
                <legend className="sr-only">Days</legend>
                {ISO_WEEKDAYS.map((weekday) => (
                  <button
                    aria-label={weekdayLabel(weekday)}
                    aria-pressed={row.weekdays.has(weekday)}
                    className={pillClassName}
                    key={weekday}
                    onClick={() => toggleDay(rowIndex, weekday)}
                    onFocus={() =>
                      setRover((current) => ({ ...current, [row.id]: weekday }))
                    }
                    tabIndex={weekday === tabStop ? 0 : -1}
                    type="button"
                  >
                    {weekdayShortLabel(weekday)}
                  </button>
                ))}
              </fieldset>
              <select
                aria-describedby={
                  hoursFieldDescriptionIds.length > 0
                    ? hoursFieldDescriptionIds
                    : undefined
                }
                aria-label={hoursSelectLabel("Start", row)}
                className={BOOKING_SELECT_CLASS_NAME}
                onChange={(event) =>
                  setRowStart(row.id, event.target.value as LocalTimeOfDay)
                }
                value={row.start}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>
              <span className="text-sm text-text">to</span>
              <select
                aria-describedby={
                  hoursFieldDescriptionIds.length > 0
                    ? hoursFieldDescriptionIds
                    : undefined
                }
                aria-label={hoursSelectLabel("End", row)}
                className={BOOKING_SELECT_CLASS_NAME}
                onChange={(event) =>
                  setRowEnd(row.id, event.target.value as LocalTimeOfDay)
                }
                value={row.end}
              >
                {endChoices.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>
              {rows.length > 1 ? (
                <button
                  className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
                  onClick={() => removeRow(row.id)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      <button
        className="c-focus-ring self-start rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
        disabled={everyDayHasHours}
        onClick={addRow}
        title={everyDayHasHours ? "Every day already has hours" : undefined}
        type="button"
      >
        Add hours
      </button>
    </fieldset>
  );
}

const endOptionsForRow = (row: HoursRow): readonly LocalTimeOfDay[] => {
  const options = endOptionsAfter(row.start);
  if (options.includes(row.end)) return options;
  return [...options, row.end].sort((left, right) => left.localeCompare(right));
};

const roverDay = (
  row: HoursRow,
  focused: IsoWeekday | undefined,
): IsoWeekday => {
  if (focused != null && ISO_WEEKDAYS.includes(focused)) return focused;
  return (
    ISO_WEEKDAYS.find((weekday) => row.weekdays.has(weekday)) ?? ISO_WEEKDAYS[0]
  );
};

const handleDayGroupKeyDown = (
  event: KeyboardEvent<HTMLFieldSetElement>,
  current: IsoWeekday,
  move: (weekday: IsoWeekday) => void,
) => {
  const index = ISO_WEEKDAYS.indexOf(current);
  if (index < 0) return;
  let nextIndex: number | null = null;
  switch (event.key) {
    case "ArrowRight":
      nextIndex = Math.min(index + 1, ISO_WEEKDAYS.length - 1);
      break;
    case "ArrowLeft":
      nextIndex = Math.max(index - 1, 0);
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = ISO_WEEKDAYS.length - 1;
      break;
    default:
      return;
  }
  const next = ISO_WEEKDAYS[nextIndex];
  if (next == null || next === current) return;
  event.preventDefault();
  move(next);
};
