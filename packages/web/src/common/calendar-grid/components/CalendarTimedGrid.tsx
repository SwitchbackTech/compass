import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  CALENDAR_EVENT_WIDTH_MINIMUM,
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_TIMED_VISIBLE_HOURS,
} from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarGridVisibleDate } from "@web/common/calendar-grid/types/calendarGrid.types";
import {
  DATA_CALENDAR_TIMED_GRID_ROW,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
  ZIndex,
} from "@web/common/constants/web.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import { blueGradient } from "@web/common/styles/theme.util";
import {
  getColorsByHour,
  getHourLabels,
} from "@web/common/utils/datetime/web.date.util";
import { getCurrentPercentOfDay } from "@web/common/utils/grid/grid.util";

interface CalendarTimedGridProps {
  columnsId?: string;
  eventsLayer: ReactNode;
  onMouseDown: MouseEventHandler<HTMLElement>;
  today: Dayjs;
  timedColumnsRef: RefCallback<HTMLDivElement>;
  timedGridId?: string;
  timedGridRef: RefCallback<HTMLDivElement>;
  visibleDates: CalendarGridVisibleDate[];
}

export const CalendarTimedGrid: FC<CalendarTimedGridProps> = ({
  columnsId = ID_GRID_COLUMNS_TIMED,
  eventsLayer,
  onMouseDown,
  timedColumnsRef,
  timedGridId = ID_GRID_MAIN,
  timedGridRef,
  today,
  visibleDates,
}) => {
  const isTodayVisible = visibleDates.some(({ date }) =>
    date.isSame(today, "day"),
  );

  return (
    <div
      aria-label="Timed events grid"
      className="c-scroll relative min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden [--scrollbar-width:0px]"
      id={timedGridId}
      ref={timedGridRef}
      role="region"
      tabIndex={-1}
    >
      <CalendarTimeColumn />
      <div
        className="absolute top-0 left-(--calendar-grid-margin-left) grid h-[calc(24*100%/var(--calendar-visible-hours))] w-[calc(100%-var(--calendar-grid-margin-left))] grid-cols-[repeat(var(--calendar-column-count),minmax(var(--calendar-column-min-width),1fr))]"
        id={columnsId}
        ref={timedColumnsRef}
        style={
          {
            "--calendar-column-count": visibleDates.length,
            "--calendar-column-min-width": `${CALENDAR_EVENT_WIDTH_MINIMUM}px`,
            "--calendar-grid-margin-left": `${CALENDAR_GRID_MARGIN_LEFT}px`,
            "--calendar-visible-hours": CALENDAR_TIMED_VISIBLE_HOURS,
          } as CSSVariables
        }
      >
        {isTodayVisible ? <CalendarNowLine /> : null}
        {visibleDates.map(({ date, key }) => (
          <div
            className="relative box-border block h-full min-w-[var(--calendar-column-min-width)] border-grid-line-primary border-l data-[past=true]:bg-bg-secondary"
            data-past={date.isBefore(today, "day")}
            aria-label={date.format("dddd, MMMM D, YYYY")}
            key={key}
            role="columnheader"
          />
        ))}
      </div>

      <div
        className="absolute left-12.5 h-full w-[calc(100%-50px)]"
        style={
          {
            "--calendar-visible-hours": CALENDAR_TIMED_VISIBLE_HOURS,
          } as CSSVariables
        }
      >
        {getHourLabels(true).map((dayTime) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: Hour rows are pointer-only drag targets for creating timed events.
          <div
            className="relative flex h-[calc(100%/var(--calendar-visible-hours))] w-full items-start border-grid-line-primary border-b"
            key={dayTime}
            {...{ [DATA_CALENDAR_TIMED_GRID_ROW]: "true" }}
            onMouseDown={onMouseDown}
          />
        ))}
      </div>

      {eventsLayer}
    </div>
  );
};

const CalendarTimeColumn = () => {
  const [currentHour, setCurrentHour] = useState(() => dayjs().hour());
  const colors = useMemo(() => getColorsByHour(currentHour), [currentHour]);
  const hourLabels = useMemo(() => getHourLabels(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      const hour = dayjs().hour();

      if (hour !== currentHour) {
        setCurrentHour(hour);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentHour]);

  return (
    <div
      className="absolute top-[calc(100%/var(--calendar-visible-hours)-5px)] z-1 h-full"
      style={
        {
          "--calendar-visible-hours": CALENDAR_TIMED_VISIBLE_HOURS,
        } as CSSVariables
      }
    >
      {hourLabels.map((label, index) => (
        <div
          className="h-[calc(100%/var(--calendar-visible-hours))]"
          style={{ color: colors[index] }}
          key={label}
        >
          <span className="block text-[10px]">{label}</span>
        </div>
      ))}
    </div>
  );
};

const CalendarNowLine = () => {
  const [percentOfDay, setPercentOfDay] = useState(() =>
    getCurrentPercentOfDay(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPercentOfDay(getCurrentPercentOfDay());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute h-px w-full"
      role="separator"
      title="now line"
      style={{
        background: blueGradient,
        top: `${percentOfDay}%`,
        zIndex: ZIndex.LAYER_2,
      }}
    />
  );
};
