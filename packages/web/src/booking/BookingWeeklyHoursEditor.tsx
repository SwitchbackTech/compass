import { useEffect, useRef, useState } from "react";
import {
  type WeeklyAvailability,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import { ISO_WEEKDAYS, weekdayLabel } from "@web/booking/booking.util";
import {
  formatHoursRanges,
  parseHoursRanges,
} from "@web/booking/weekly-hours.parse";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

type Weekday = WeeklyAvailabilityInterval["weekday"];

const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5];

interface BookingWeeklyHoursEditorProps {
  value: WeeklyAvailability;
  onChange: (value: WeeklyAvailability) => void;
  disabled?: boolean;
  /** Raised when a row cannot be read, so the form can block saving. */
  onValidityChange?: (isValid: boolean) => void;
  /** Jump keys to reveal beside the legend while hold-Mod hints are up. */
  shortcutKeys?: string;
}

const textForWeekday = (value: WeeklyAvailability, weekday: Weekday): string =>
  formatHoursRanges(value.filter((entry) => entry.weekday === weekday));

const textsFromAvailability = (
  value: WeeklyAvailability,
): Record<Weekday, string> =>
  Object.fromEntries(
    ISO_WEEKDAYS.map((weekday) => [weekday, textForWeekday(value, weekday)]),
  ) as Record<Weekday, string>;

/**
 * One typed range per day - "9-5", or "9-12, 1-5", or blank for unavailable.
 *
 * This replaced a checkbox plus two native <input type="time"> per day: 21 tab
 * stops, each time input itself a multi-segment widget. Blankness is now the
 * unavailable state, so the checkboxes are gone, and the parser is the same
 * one behind the event form's time field.
 */
export function BookingWeeklyHoursEditor({
  value,
  onChange,
  disabled = false,
  onValidityChange,
  shortcutKeys,
}: BookingWeeklyHoursEditorProps) {
  // Raw text per row so a half-typed value is never yanked out from under the
  // user; it only becomes availability once it parses.
  const [texts, setTexts] = useState<Record<Weekday, string>>(() =>
    textsFromAvailability(value),
  );
  const [errors, setErrors] = useState<Partial<Record<Weekday, string>>>({});
  const [announcement, setAnnouncement] = useState("");
  // What we last handed upward. Anything else arriving in `value` came from
  // outside - the server response seeding the form - so the rows resync,
  // without yanking a half-typed value out from under the user.
  const emittedRef = useRef<WeeklyAvailability>(value);

  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    setTexts(textsFromAvailability(value));
    setErrors({});
  }, [value]);

  useEffect(() => {
    onValidityChange?.(Object.keys(errors).length === 0);
  }, [errors, onValidityChange]);

  const commit = (nextTexts: Record<Weekday, string>) => {
    const nextErrors: Partial<Record<Weekday, string>> = {};
    const intervals: WeeklyAvailabilityInterval[] = [];

    for (const weekday of ISO_WEEKDAYS) {
      const result = parseHoursRanges(nextTexts[weekday] ?? "");
      if (!result.ok) {
        nextErrors[weekday] = result.error;
        continue;
      }
      for (const range of result.ranges) {
        intervals.push({ weekday, start: range.start, end: range.end });
      }
    }

    setErrors(nextErrors);
    emittedRef.current = intervals;
    onChange(intervals);
  };

  const setText = (weekday: Weekday, text: string) => {
    setTexts((current) => ({ ...current, [weekday]: text }));
  };

  const commitRow = (weekday: Weekday) => {
    const result = parseHoursRanges(texts[weekday] ?? "");
    const nextTexts = result.ok
      ? { ...texts, [weekday]: formatHoursRanges(result.ranges) }
      : texts;
    setTexts(nextTexts);
    commit(nextTexts);
  };

  const applyToWeekdays = () => {
    const source = texts[1] ?? "";
    const nextTexts = { ...texts };
    for (const weekday of WEEKDAYS) nextTexts[weekday] = source;
    setTexts(nextTexts);
    commit(nextTexts);
    setAnnouncement(
      source.trim() === ""
        ? "Cleared Monday through Friday"
        : `Set Monday through Friday to ${source}`,
    );
  };

  const clearAll = () => {
    const nextTexts = Object.fromEntries(
      ISO_WEEKDAYS.map((weekday) => [weekday, ""]),
    ) as Record<Weekday, string>;
    setTexts(nextTexts);
    commit(nextTexts);
    setAnnouncement("Cleared every day");
  };

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 flex items-center gap-1 text-sm text-text">
        Weekly hours
        {shortcutKeys ? <ShortcutKeys keys={shortcutKeys} /> : null}
      </legend>
      <p className="text-text-muted text-xs" id="booking-hours-hint">
        Type a range like 9-5, or 9-12, 1-5 for a break. Leave a day blank to be
        unavailable.
      </p>

      <span aria-live="polite" className="sr-only" role="status">
        {announcement}
      </span>

      {ISO_WEEKDAYS.map((weekday) => (
        <div className="flex flex-col gap-1" key={weekday}>
          <div className="flex items-center gap-2">
            <label
              className="w-28 shrink-0 text-sm text-text"
              htmlFor={`booking-hours-${weekday}`}
            >
              {weekdayLabel(weekday)}
            </label>
            <input
              aria-describedby="booking-hours-hint"
              aria-invalid={errors[weekday] ? true : undefined}
              className="c-focus-ring w-40 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
              id={`booking-hours-${weekday}`}
              onBlur={() => commitRow(weekday)}
              onChange={(event) => setText(weekday, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRow(weekday);
              }}
              placeholder="9-5"
              type="text"
              value={texts[weekday] ?? ""}
            />
            {(texts[weekday] ?? "").trim() === "" && !errors[weekday] ? (
              <span className="text-sm text-text-muted">Unavailable</span>
            ) : null}
          </div>
          {errors[weekday] ? (
            <p className="text-error pl-30 text-xs" role="alert">
              {errors[weekday]}
            </p>
          ) : null}
        </div>
      ))}

      <div className="mt-1 flex gap-2">
        <button
          className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
          onClick={applyToWeekdays}
          type="button"
        >
          Apply Monday to weekdays
        </button>
        <button
          className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
          onClick={clearAll}
          type="button"
        >
          Clear all
        </button>
      </div>
    </fieldset>
  );
}
