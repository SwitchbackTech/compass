import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayjs from "@core/util/date/dayjs";
import { PublicBookingMonthNav } from "@web/booking/PublicBookingMonthNav";
import {
  collectBookingAvailableDateKeys,
  formatBookingDateKey,
  formatBookingMonthDayLabel,
  listBookingAvailableDayKeys,
  listBookingMonthGridWeeks,
  listBookingWeekdayHeadings,
  stepBookingAvailableDay,
} from "@web/booking/public-booking.format";

interface PublicBookingMonthGridProps {
  monthKey: string;
  timeZone: string;
  maxHorizonDays: number;
  slots: readonly { slotStart: string }[];
  selectedDateKey: string | null;
  todayKey?: string;
  onMonthChange: (monthKey: string) => void;
  onPrefetchMonth: (monthKey: string) => void;
  onSelectDate: (dateKey: string) => void;
}

export function PublicBookingMonthGrid({
  monthKey,
  timeZone,
  maxHorizonDays,
  slots,
  selectedDateKey,
  todayKey,
  onMonthChange,
  onPrefetchMonth,
  onSelectDate,
}: PublicBookingMonthGridProps) {
  const resolvedTodayKey = todayKey ?? formatBookingDateKey(dayjs(), timeZone);
  const availableDateKeys = useMemo(
    () => collectBookingAvailableDateKeys(slots, timeZone),
    [slots, timeZone],
  );
  const weeks = useMemo(
    () =>
      listBookingMonthGridWeeks(
        monthKey,
        timeZone,
        availableDateKeys,
        resolvedTodayKey,
      ),
    [availableDateKeys, monthKey, resolvedTodayKey, timeZone],
  );
  const availableDays = useMemo(
    () => listBookingAvailableDayKeys(weeks),
    [weeks],
  );
  const weekdayHeadings = useMemo(
    () => listBookingWeekdayHeadings(timeZone),
    [timeZone],
  );

  const [focusedDateKey, setFocusedDateKey] = useState<string | null>(
    () => selectedDateKey ?? availableDays[0] ?? null,
  );
  const moveFocusRef = useRef(false);

  useEffect(() => {
    setFocusedDateKey((current) => {
      if (selectedDateKey && availableDays.includes(selectedDateKey)) {
        return selectedDateKey;
      }
      if (current && availableDays.includes(current)) {
        return current;
      }
      return availableDays[0] ?? null;
    });
  }, [availableDays, selectedDateKey]);

  useEffect(() => {
    if (!moveFocusRef.current || !focusedDateKey) {
      return;
    }
    moveFocusRef.current = false;
    const button = document.getElementById(
      bookingDayButtonId(monthKey, focusedDateKey),
    );
    button?.focus();
  }, [focusedDateKey, monthKey]);

  const tabStopDateKey = focusedDateKey ?? availableDays[0] ?? null;

  const handleDayKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    dateKey: string,
  ) => {
    if (availableDays.length === 0) {
      return;
    }
    let next = dateKey;
    if (event.key === "ArrowLeft") {
      next = stepBookingAvailableDay(
        dateKey,
        availableDays,
        timeZone,
        "previous",
      );
    } else if (event.key === "ArrowRight") {
      next = stepBookingAvailableDay(dateKey, availableDays, timeZone, "next");
    } else if (event.key === "ArrowUp") {
      next = stepBookingAvailableDay(
        dateKey,
        availableDays,
        timeZone,
        "previousWeek",
      );
    } else if (event.key === "ArrowDown") {
      next = stepBookingAvailableDay(
        dateKey,
        availableDays,
        timeZone,
        "nextWeek",
      );
    } else if (event.key === "Home") {
      next = availableDays[0] ?? dateKey;
    } else if (event.key === "End") {
      next = availableDays[availableDays.length - 1] ?? dateKey;
    } else {
      return;
    }
    event.preventDefault();
    moveFocusRef.current = true;
    setFocusedDateKey(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <PublicBookingMonthNav
        monthKey={monthKey}
        timeZone={timeZone}
        maxHorizonDays={maxHorizonDays}
        onMonthChange={onMonthChange}
        onPrefetchMonth={onPrefetchMonth}
      />
      <table
        className="w-full table-fixed border-collapse"
        role="grid"
        aria-labelledby="booking-month-heading"
      >
        <thead>
          <tr>
            {weekdayHeadings.map((weekday) => (
              <th
                key={weekday.long}
                scope="col"
                className="pb-1 text-center font-medium text-text-muted text-xs"
              >
                <span aria-hidden="true">{weekday.short}</span>
                <span className="sr-only">{weekday.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((cell, cellIndex) => {
                if (cell.kind === "pad") {
                  return (
                    <td
                      key={`pad-${weekIndex}-${cellIndex}`}
                      className="p-0.5"
                    />
                  );
                }
                const { day } = cell;
                const isSelected = selectedDateKey === day.dateKey;
                const label = formatBookingMonthDayLabel(day.dateKey, timeZone);
                return (
                  <td
                    key={day.dateKey}
                    role="gridcell"
                    className="p-0.5"
                    aria-selected={day.available ? isSelected : undefined}
                  >
                    {day.available ? (
                      <button
                        type="button"
                        id={bookingDayButtonId(monthKey, day.dateKey)}
                        aria-label={label}
                        aria-current={day.isToday ? "date" : undefined}
                        tabIndex={tabStopDateKey === day.dateKey ? 0 : -1}
                        onClick={() => {
                          setFocusedDateKey(day.dateKey);
                          onSelectDate(day.dateKey);
                        }}
                        onKeyDown={(event) =>
                          handleDayKeyDown(event, day.dateKey)
                        }
                        className={`flex h-10 w-full items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          isSelected
                            ? "bg-accent text-on-accent hover:bg-accent"
                            : "text-text hover:bg-surface-panel"
                        }`}
                      >
                        {day.dayOfMonth}
                      </button>
                    ) : (
                      <span
                        className="flex h-10 w-full cursor-default items-center justify-center rounded-md text-sm text-text-muted"
                        aria-current={day.isToday ? "date" : undefined}
                      >
                        {day.dayOfMonth}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function bookingDayButtonId(monthKey: string, dateKey: string): string {
  return `booking-day-${monthKey}-${dateKey}`;
}
