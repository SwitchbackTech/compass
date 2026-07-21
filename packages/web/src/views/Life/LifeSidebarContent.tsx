import { useEffect, useRef, useState } from "react";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { NumberInput } from "@web/components/NumberInput/NumberInput";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  clampLifespan,
  formatDateInputValue,
  getRandomLifespan,
  LIFE_VARIATIONS,
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
  const [lifespanInput, setLifespanInput] = useState(() =>
    String(preferences.lifespan),
  );
  const previousLifespanRef = useRef(preferences.lifespan);
  const birthDate = parseLifeDate(preferences.birthDate);
  const variation = LIFE_VARIATIONS[preferences.variation];

  useEffect(() => {
    if (previousLifespanRef.current !== preferences.lifespan) {
      setLifespanInput(String(preferences.lifespan));
      previousLifespanRef.current = preferences.lifespan;
    }
  }, [preferences.lifespan]);
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

    const birthDateValue = formatDateInputValue(date);
    onPreferencesChange((current) => ({
      ...current,
      birthDate: birthDateValue,
      lifespan:
        current.variation === "random"
          ? getRandomLifespan(birthDateValue, today)
          : current.lifespan,
    }));
    setIsBirthDatePickerOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 pb-5 text-sm">
      <section className="flex flex-col gap-2 text-text-muted">
        <h2 className="font-semibold text-text">{variation.label}</h2>
        <p>{variation.description}</p>
      </section>

      <section className="flex flex-col gap-2 text-center">
        <p aria-live="polite" className="font-medium text-text" role="status">
          {summary}
        </p>
      </section>

      <section
        aria-label="Life details"
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="flex w-full flex-col items-center gap-1 text-text-muted">
          <TooltipWrapper description="We don't store this information">
            <span className="cursor-help">Date of birth</span>
          </TooltipWrapper>
          <DatePicker
            aria-label="Date of birth"
            calendarClassName="lifeBirthDatePicker"
            dateFormat="MMM d, yyyy"
            id="life-date-of-birth"
            inputClassName="c-life-input w-44"
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
            withUnderline={false}
          />
        </div>

        <label
          className="flex w-full flex-col items-center gap-1 text-text-muted"
          htmlFor="life-age-of-death"
        >
          Age of Death
          <NumberInput
            ariaLabel="Age of Death"
            id="life-age-of-death"
            max={MAX_LIFESPAN}
            min={MIN_LIFESPAN}
            onChange={(value) => {
              setLifespanInput(value);
              if (!value) return;

              const parsed = Number(value);
              if (!Number.isFinite(parsed)) return;
              onPreferencesChange((current) => ({
                ...current,
                lifespan: clampLifespan(parsed),
              }));
            }}
            value={lifespanInput}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 text-text-muted">
        <h2 className="font-semibold text-text">About Life.</h2>
        <p>
          This page shows your life as a grid of weeks. Each dot represents one
          week of your life, and each row represents one year.
        </p>
      </section>
    </div>
  );
}
