import { type Calendar } from "@core/types/calendar.contracts";
import { GRID_MARGIN_LEFT } from "@web/grid/grid.constants";

export const DayCalendarColumnHeaders = ({
  calendars,
}: {
  calendars: Calendar[];
}) => (
  <section
    aria-label="Calendars"
    className="grid min-h-12 shrink-0 bg-background"
    style={{
      gridTemplateColumns: `repeat(${calendars.length}, minmax(0, 1fr))`,
      marginLeft: GRID_MARGIN_LEFT,
    }}
  >
    {calendars.map((calendar) => (
      <div
        className="flex min-w-0 items-center justify-center gap-2 border-border border-l px-3 last:border-r"
        key={calendar.id}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: calendar.backgroundColor }}
        />
        <span className="truncate text-sm text-text">{calendar.name}</span>
      </div>
    ))}
  </section>
);
