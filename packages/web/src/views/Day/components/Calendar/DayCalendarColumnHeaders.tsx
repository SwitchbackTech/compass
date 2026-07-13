import { type Calendar } from "@core/types/calendar.contracts";
import { CALENDAR_GRID_MARGIN_LEFT } from "@web/layout/calendar-grid/calendarGrid.constants";

export const DayCalendarColumnHeaders = ({
  calendars,
}: {
  calendars: Calendar[];
}) => (
  <section
    aria-label="Calendars"
    className="grid min-h-12 shrink-0 border-grid-line-primary border-b"
    style={{
      gridTemplateColumns: `repeat(${calendars.length}, minmax(0, 1fr))`,
      marginLeft: CALENDAR_GRID_MARGIN_LEFT,
    }}
  >
    {calendars.map((calendar) => (
      <div
        className="flex min-w-0 items-center justify-center gap-2 border-grid-line-primary border-l px-3"
        key={calendar.id}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: calendar.backgroundColor }}
        />
        <span className="truncate text-sm text-text-primary">
          {calendar.name}
        </span>
      </div>
    ))}
  </section>
);
