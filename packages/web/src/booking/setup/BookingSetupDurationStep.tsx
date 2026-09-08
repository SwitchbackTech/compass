import { type KeyboardEvent, useState } from "react";
import { type BookingDurationMinutes } from "@core/types/booking.contracts";

export const BOOKING_DURATION_OPTIONS: BookingDurationMinutes[] = [
  15, 30, 45, 60,
];

const pillClassName =
  "c-focus-ring min-h-8 min-w-8 rounded border border-border px-2 text-sm text-text hover:bg-surface-panel aria-checked:border-accent aria-checked:bg-accent aria-checked:text-on-accent";

interface BookingSetupDurationStepProps {
  onChange: (durationMinutes: BookingDurationMinutes) => void;
  value: BookingDurationMinutes;
}

export function BookingSetupDurationStep({
  onChange,
  value,
}: BookingSetupDurationStepProps) {
  const [rover, setRover] = useState<BookingDurationMinutes>(value);

  const move = (next: BookingDurationMinutes) => {
    setRover(next);
    onChange(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = BOOKING_DURATION_OPTIONS.indexOf(rover);
    if (index < 0) return;
    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = Math.min(index + 1, BOOKING_DURATION_OPTIONS.length - 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = BOOKING_DURATION_OPTIONS.length - 1;
        break;
      case " ":
        event.preventDefault();
        move(rover);
        return;
      default:
        return;
    }
    const next = BOOKING_DURATION_OPTIONS[nextIndex];
    if (next == null || next === rover) return;
    event.preventDefault();
    move(next);
    const pills =
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    pills[nextIndex]?.focus();
  };

  return (
    <div
      aria-label="Duration"
      className="flex flex-wrap gap-2"
      onKeyDown={handleKeyDown}
      role="radiogroup"
    >
      {BOOKING_DURATION_OPTIONS.map((minutes) => (
        <button
          aria-checked={value === minutes}
          className={pillClassName}
          key={minutes}
          onClick={() => move(minutes)}
          onFocus={() => setRover(minutes)}
          role="radio"
          tabIndex={minutes === rover ? 0 : -1}
          type="button"
        >
          {minutes} minutes
        </button>
      ))}
    </div>
  );
}
