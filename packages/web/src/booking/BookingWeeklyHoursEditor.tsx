import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { type WeeklyAvailability } from "@core/types/booking.contracts";
import {
  ISO_WEEKDAYS,
  type IsoWeekday,
  weekdayLabel,
  weekdayShortLabel,
} from "@web/booking/booking.util";
import {
  formatHoursRanges,
  parseHoursRanges,
} from "@web/booking/weekly-hours.parse";
import {
  availabilityFromRows,
  claimWeekday,
  type HoursRow,
  hoursInputLabel,
  rowsFromAvailability,
  textForRow,
  unassignedWeekdays,
} from "@web/booking/weekly-hours.rows";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

interface BookingWeeklyHoursEditorProps {
  value: WeeklyAvailability;
  onChange: (value: WeeklyAvailability) => void;
  disabled?: boolean;
  /** Raised when a row cannot be read, so the form can block saving. */
  onValidityChange?: (isValid: boolean) => void;
  /** True while a row's typed text has not been committed into `value`. */
  onDraftDirtyChange?: (isDirty: boolean) => void;
  /** Jump keys to reveal beside the legend while hold-Mod hints are up. */
  shortcutKeys?: readonly string[];
}

interface EditorRow extends HoursRow {
  id: number;
}

const emptyRow = (): HoursRow => ({
  weekdays: new Set<IsoWeekday>(),
  text: "",
});

const toEditorRows = (
  value: WeeklyAvailability,
  nextId: () => number,
): EditorRow[] => {
  const grouped = rowsFromAvailability(value);
  const source = grouped.length > 0 ? grouped : [emptyRow()];
  return source.map((row) => ({ ...row, id: nextId() }));
};

const pillClassName =
  "c-focus-ring min-h-8 min-w-8 rounded border border-border px-1.5 text-xs text-text hover:bg-surface-panel aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent";

/**
 * Grouped day-pill rows: one typed range shared by the days in that row.
 */
export function BookingWeeklyHoursEditor({
  value,
  onChange,
  disabled = false,
  onValidityChange,
  onDraftDirtyChange,
  shortcutKeys,
}: BookingWeeklyHoursEditorProps) {
  const hintId = useId();
  const idRef = useRef(1);
  const allocId = () => {
    const id = idRef.current;
    idRef.current += 1;
    return id;
  };
  const [rows, setRows] = useState<EditorRow[]>(() =>
    toEditorRows(value, allocId),
  );
  const [errors, setErrors] = useState<ReadonlyMap<number, string>>(new Map());
  const [announcement, setAnnouncement] = useState("");
  const [rover, setRover] = useState<Record<number, IsoWeekday>>({});
  const emittedRef = useRef<WeeklyAvailability>(value);
  const draftDirtyRef = useRef(false);

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
    setErrors(new Map());
  }, [value]);

  useEffect(() => {
    onValidityChange?.(errors.size === 0);
  }, [errors, onValidityChange]);

  useEffect(() => {
    if (!onDraftDirtyChange) return;
    const dirty = rows.some((row) => row.text !== textForRow(value, row));
    if (draftDirtyRef.current === dirty) return;
    draftDirtyRef.current = dirty;
    onDraftDirtyChange(dirty);
  }, [onDraftDirtyChange, rows, value]);

  const commitRows = (nextRows: EditorRow[], liveAnnouncement?: string) => {
    const result = availabilityFromRows(nextRows);
    setRows(nextRows);
    if (!result.ok) {
      setErrors(result.errors);
      if (liveAnnouncement) setAnnouncement(liveAnnouncement);
      return;
    }
    setErrors(new Map());
    emittedRef.current = result.value;
    onChange(result.value);
    if (liveAnnouncement) setAnnouncement(liveAnnouncement);
  };

  const setRowText = (id: number, text: string) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, text } : row)),
    );
  };

  const commitText = (id: number) => {
    const current = rows.find((row) => row.id === id);
    if (!current) return;
    const parsed = parseHoursRanges(current.text);
    const snapped = parsed.ok ? formatHoursRanges(parsed.ranges) : current.text;
    const nextRows = rows.map((row) =>
      row.id === id ? { ...row, text: snapped } : row,
    );
    commitRows(nextRows);
  };

  const toggleDay = (rowIndex: number, weekday: IsoWeekday) => {
    const next = claimWeekday(rows, rowIndex, weekday).map((row, index) => ({
      ...row,
      id: rows[index]?.id ?? allocId(),
    }));
    const pressed = next[rowIndex]?.weekdays.has(weekday) === true;
    commitRows(
      next,
      pressed
        ? `Added ${weekdayLabel(weekday)}`
        : `Removed ${weekdayLabel(weekday)}`,
    );
  };

  const addRow = () => {
    const seeded = new Set(unassignedWeekdays(rows));
    const next: EditorRow[] = [
      ...rows,
      { id: allocId(), weekdays: seeded, text: "" },
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

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 flex items-center gap-1 text-sm text-text">
        Weekly hours
        {shortcutKeys ? <ShortcutKeys keys={[...shortcutKeys]} /> : null}
      </legend>
      <p className="text-text-muted text-xs" id={hintId}>
        Type a range like 9-5, or 9-12, 1-5 for a break.
      </p>
      {unavailableCopy ? (
        <p className="text-sm text-text-muted">{unavailableCopy}</p>
      ) : null}

      <span aria-live="polite" className="sr-only" role="status">
        {announcement}
      </span>

      {rows.map((row, rowIndex) => {
        const error = errors.get(rowIndex);
        const errorId = error ? `booking-hours-row-${row.id}-error` : undefined;
        const tabStop = roverDay(row, rover[row.id]);
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
              <input
                aria-describedby={errorId ? `${hintId} ${errorId}` : hintId}
                aria-invalid={error ? true : undefined}
                aria-label={hoursInputLabel(row)}
                className="c-focus-ring min-w-40 flex-1 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
                id={`booking-hours-row-${row.id}`}
                onBlur={() => commitText(row.id)}
                onChange={(event) => setRowText(row.id, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitText(row.id);
                  }
                }}
                placeholder="9-5"
                type="text"
                value={row.text}
              />
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
            {error ? (
              <p className="text-error text-xs" id={errorId} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        className="c-focus-ring self-start rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
        onClick={addRow}
        type="button"
      >
        Add hours
      </button>
    </fieldset>
  );
}

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
