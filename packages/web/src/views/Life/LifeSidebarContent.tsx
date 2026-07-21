import { useState } from "react";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  clampLifespan,
  formatDateInputValue,
  MAX_LIFESPAN,
  MIN_LIFESPAN,
  parseLifeDate,
} from "./life.utils";
import { type LifePreferences } from "./life-preferences.storage";

interface LifeSidebarContentProps {
  preferences: LifePreferences;
  summary: string;
  today: Date;
  onPreferencesChange: (
    update: (current: LifePreferences) => LifePreferences,
  ) => void;
}

export function LifeSidebarContent({
  preferences,
  summary,
  today,
  onPreferencesChange,
}: LifeSidebarContentProps) {
  const [isBirthDatePickerOpen, setIsBirthDatePickerOpen] = useState(false);
  const birthDate = parseLifeDate(preferences.birthDate);
  const clearBirthDate = () => {
    onPreferencesChange((current) => ({ ...current, birthDate: "" }));
    setIsBirthDatePickerOpen(false);
  };
  const setBirthDate = (date: Date) => {
    const minimumDate = new Date(1900, 0, 1);
    const maximumDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    if (date < minimumDate || date > maximumDate) return;

    onPreferencesChange((current) => ({
      ...current,
      birthDate: formatDateInputValue(date),
    }));
    setIsBirthDatePickerOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 pb-5 text-sm">
      <section className="flex flex-col gap-3 text-text-muted">
        <h2 className="font-semibold text-text">About Life in Weeks</h2>
        <p>
          This page shows your life as a grid of weeks. Each dot represents one
          week of your life, and each row represents one year.
        </p>
        <p>
          The default death age is set to 79. However, life expectancy varies
          significantly by country and other factors.
        </p>
      </section>

      <section
        aria-label="Life details"
        className="flex flex-col items-center gap-4 text-center"
      >
        <p aria-live="polite" className="font-medium text-text" role="status">
          {summary}
        </p>

        <div className="flex w-full flex-col items-center gap-1 text-text-muted">
          <TooltipWrapper description="We don't store this information">
            <span className="cursor-help">Date of birth</span>
          </TooltipWrapper>
          <DatePicker
            aria-label="Date of birth"
            calendarClassName="lifeBirthDatePicker"
            dateFormat="MMM d, yyyy"
            id="life-date-of-birth"
            isClearable
            isOpen={isBirthDatePickerOpen}
            maxDate={today}
            minDate={new Date(1900, 0, 1)}
            onCalendarClose={() => setIsBirthDatePickerOpen(false)}
            onCalendarOpen={() => setIsBirthDatePickerOpen(true)}
            onChange={(date) => (date ? setBirthDate(date) : clearBirthDate())}
            onChangeRaw={(event) => {
              const value = event.currentTarget.value;
              const date = parseLifeDate(value);
              if (date) {
                setBirthDate(date);
              } else if (!value) {
                clearBirthDate();
              }
            }}
            onInputClick={() => setIsBirthDatePickerOpen(true)}
            onSelect={(date) => {
              if (!date) return;
              setBirthDate(date);
            }}
            placeholderText="Select date"
            selected={birthDate ?? undefined}
            title="Date of birth"
            view="grid"
          />
        </div>

        <label className="flex w-full flex-col items-center gap-1 text-text-muted">
          Age of Death
          <input
            aria-label="Age of Death"
            className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-center text-text outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            id="life-age-of-death"
            max={MAX_LIFESPAN}
            min={MIN_LIFESPAN}
            onChange={(event) =>
              onPreferencesChange((current) => ({
                ...current,
                lifespan: clampLifespan(event.target.valueAsNumber),
              }))
            }
            type="number"
            value={preferences.lifespan}
          />
        </label>
      </section>
    </div>
  );
}
