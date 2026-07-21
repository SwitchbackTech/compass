import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getCommandPalettePlaceholder } from "@web/common/constants/more.cmd.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { LifeCommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { LifeAboutDialog } from "./LifeAboutDialog";
import { LifeGrid } from "./LifeGrid";
import {
  clampLifespan,
  formatDateInputValue,
  getTotalLifeDots,
  getWeekLivedCount,
  MAX_LIFESPAN,
  MIN_LIFESPAN,
  parseLifeDate,
} from "./life.utils";
import {
  readLifePreferences,
  writeLifePreferences,
} from "./life-preferences.storage";

interface LifeViewProps {
  today?: Date;
}

function formatWeeks(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function LifeView({ today }: LifeViewProps) {
  const currentDate = today ?? new Date();
  const maxBirthDate = formatDateInputValue(currentDate);
  const [preferences, setPreferences] = useState(readLifePreferences);
  const totalDots = useMemo(
    () => getTotalLifeDots(preferences.lifespan),
    [preferences.lifespan],
  );
  const weeksLived = useMemo(
    () => getWeekLivedCount(preferences.birthDate, totalDots, currentDate),
    [preferences.birthDate, totalDots, currentDate],
  );
  const hasBirthDate = parseLifeDate(preferences.birthDate) !== null;
  const summary = hasBirthDate
    ? `${formatWeeks(weeksLived)} weeks lived - ${Math.floor(weeksLived / 52)} years - ${Math.round((weeksLived / totalDots) * 100)}%`
    : "Birth date not set";

  useEffect(() => {
    writeLifePreferences(preferences);
  }, [preferences]);

  return (
    <main className="min-h-screen overflow-auto bg-background text-text">
      <LifeCommandPalette placeholder={getCommandPalettePlaceholder("life")} />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pt-5 pb-8 md:px-8">
        <header className="flex h-auto min-h-12 shrink-0 flex-wrap items-center gap-3 text-text-muted md:flex-nowrap">
          <Link
            to={ROOT_ROUTES.WEEK}
            className="c-focus-ring rounded text-sm text-text-muted transition-colors hover:text-text"
          >
            Back to calendar
          </Link>
          <div className="flex min-w-0 items-center gap-2 md:ml-3">
            <h1 className="font-semibold text-text text-xl tracking-normal">
              Life
            </h1>
            <LifeAboutDialog />
          </div>
          <p
            aria-live="polite"
            className="w-full text-sm text-text-muted md:ml-auto md:w-auto"
            role="status"
          >
            {summary}
          </p>
        </header>

        <section
          aria-label="Life preferences"
          className="mt-6 flex flex-wrap items-end gap-3"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-text-muted sm:max-w-52">
            Date of birth
            <input
              aria-label="Date of birth"
              className="h-9 rounded-md border border-border bg-surface px-3 text-text outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              max={maxBirthDate}
              min="1900-01-01"
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              type="date"
              value={preferences.birthDate}
            />
          </label>

          <label className="flex w-32 flex-col gap-1 text-sm text-text-muted">
            Through age
            <input
              aria-label="Through age"
              className="h-9 rounded-md border border-border bg-surface px-3 text-text outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              max={MAX_LIFESPAN}
              min={MIN_LIFESPAN}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  lifespan: clampLifespan(event.target.valueAsNumber),
                }))
              }
              type="number"
              value={preferences.lifespan}
            />
          </label>
        </section>

        <section
          aria-label={`Life visualization: ${summary}`}
          className="mt-6 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          <LifeGrid
            showCurrentWeek={hasBirthDate}
            totalDots={totalDots}
            weeksLived={weeksLived}
          />
        </section>
      </div>
    </main>
  );
}

export default LifeView;
