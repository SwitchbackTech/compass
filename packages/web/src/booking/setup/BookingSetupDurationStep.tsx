import { type KeyboardEvent, useState } from "react";
import { type BookingDurationMinutes } from "@core/types/booking.contracts";

const DURATION_OPTIONS: BookingDurationMinutes[] = [15, 30, 45, 60];

const pillClassName =
  "c-focus-ring min-h-10 min-w-14 rounded border border-border px-3 text-sm text-text hover:bg-surface-panel aria-checked:border-accent aria-checked:bg-accent aria-checked:text-on-accent";

interface BookingSetupDurationStepProps {
  onChange: (durationMinutes: BookingDurationMinutes) => void;
  value: BookingDurationMinutes;
}

export function BookingSetupDurationStep({
  onChange,
  value,
}: BookingSetupDurationStepProps) {
  const [focusedMinutes, setFocusedMinutes] =
    useState<BookingDurationMinutes>(value);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = DURATION_OPTIONS.indexOf(focusedMinutes);
    if (index < 0) return;

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = Math.min(index + 1, DURATION_OPTIONS.length - 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = DURATION_OPTIONS.length - 1;
        break;
      case " ":
        event.preventDefault();
        onChange(focusedMinutes);
        return;
      default:
        return;
    }

    const next = DURATION_OPTIONS[nextIndex ?? index];
    if (next == null || next === focusedMinutes) return;
    event.preventDefault();
    setFocusedMinutes(next);
    onChange(next);
    const button = event.currentTarget.querySelector<HTMLElement>(
      `[data-duration="${next}"]`,
    );
    button?.focus();
  };

  return (
    <div
      aria-label="Meeting duration"
      className="flex flex-wrap gap-2"
      onKeyDown={handleKeyDown}
      role="radiogroup"
    >
      {DURATION_OPTIONS.map((minutes) => (
        // biome-ignore lint/a11y/useSemanticElements: pill buttons use roving tabindex like weekly day pills
        <button
          aria-checked={value === minutes}
          className={pillClassName}
          data-duration={minutes}
          key={minutes}
          onClick={() => {
            setFocusedMinutes(minutes);
            onChange(minutes);
          }}
          onFocus={() => setFocusedMinutes(minutes)}
          role="radio"
          tabIndex={minutes === focusedMinutes ? 0 : -1}
          type="button"
        >
          {minutes} min
        </button>
      ))}
    </div>
  );
}
